# Travel Itenary Planner Application - Wandrly BACKEND

1. Role based permissions (like Admin, Treasurer, Editor, Viewer), the user creating the trip can assign roles to other group members. 
-> Controlled access over the trip planning, useful for discussing API security and authorization in the project.

2. Built-in splitwise, helps users by bringing the cost splitting logic inside a single app, each trip will have its own account.
-> Complex mathematical logic

3. Quick-polls - to stop endless groupchat debates about the next stop, or what to eat.
-> Websockets and real-time state management

4. Event specific "meeting point" map - for events like "meet at the station at 8", the app activates a temporary live-location sharing map just for the group, say 30 mins before the event.
-> Working with geolocation APIs, solves a real world problems of getting lost in a new city

5. The "Vibe check" pacing dashboard, activities are tagged by energy level (chill,moderate,intense), provides a visual bar chart of the day's energy, warns if too many high energy activities are back to back.
-> an eye candy type feature, shows empathy towards user problems

6. "Fill the gap" button - for 2 successive activities planned but there is 2-3 hour gap, it suggests some low commitment activities to do within a couple of kilometres to kill that time
-> geolocation APIs

7. Weather and itenary-aware packing list, weather API fetches a 10 day forecast, cross references to the destination and the activities planned and suggests a list

8. One click Travelogue Expert - traces the route taken throughout the trip on an interactive map, where clicking on each location provides a collection of photos taken on that location
-> 3rd party cloud storage like AWS S3 or cloudinary


# Database design - ERD
-> Our application has some strong relations that need to be taken care of so we will be using PostgreSQL as our DB.

1. "Users" Table
   - id (UUID, primary key)
   - name, email, password_hash
   - created_polls 
   - votes         
  
2. "Trips" Table - the group
   - id (UUID, primary key)
   - title, destination, startDate, endDate
   - public_share_token(for the travelogue export)
   - polls

3. "TripUsers" Table - permissions
   - trip_id, user_id, role (admin, editor,viewer etc)
  
4. "Itenary_Events" Table
   - id (UUID,primary key)
   - trip_id(foreign key)
   - title, startTime, endTime
   - lat, long (coordinates of location)
   - intensity_level
  
5. "Trip Media" Table - for the travelogue
   - id(UUID, primary key)
   - trip_id(foreign key)
   - event_id(foreign key, nullable - in case a photo is uploaded not tied to an event)
   - uploaded_by (foreign key -> users.id)
   - file_url (cloudinary or AWS S3)
  
6. "Packing List" Table
   - id(UUID, primary key)
   - trip_id(foreign key)
   - item_name
   - is_packed
   - auto_generated_reason (nullable) - ex: added umbrella due to possible rain on 3rd day

7A. "Expenses" Table
   - id(UUID, primary key)
   - trip_id(foreign key)
   - paid_by (foreign key)
   - amount
   - description 
7B. "Expense-splits" Table
   - id(UUID, primary key)
   - expense_id(foreign key)
   - user_id(foreign key)
   - amount_owed
  
8. "Poll" Table
   - id(UUID, primary key)
   - trip_id(foreign key)
   - created_by(foreign key)
   - question
  
9. "PollOption" Table
    - id(UUID, primary key)
    - poll_id(foreign key)
    - option_text

10. "Vote" Table
    - poll_id(foreign key)
    - user_id(foreign key)
    - option_id(foreign key)
    - [poll_id , user_id] (composite primary key)


--> WHY 2 TABLES FOR EXPENSES ??
Expense tracker will need to show - "Total money owed by Friend A",
if we store all data in one table, i.e. storing an array of users for every expense added in the table, to display the above data, the DB has to scan every row in expense table, and check if "Friend A" is involved in that and then do the math, as our app grows this will become very slow and will violate the 1NF which states that data should be atomic(no lists inside a single column)

Hence we use 2 tables, so first we create receipt like "30 rupee coffee, paid for by SKS"
and then in expense split table we store 3 rows, of the 3 people involved like 
"tied to coffee, friend A owes 10 rupees" , "tied to coffee, friend B owes 10 rupees" , "tied to coffee, SKS owes 10 rupees"

By putting individual splits in their own table, I can use a simple SUM() query to instantly evaluate how much a user owes across the trip, which makes the app very fast.


--> Wrapping the expense adding(receipt) and expense split queries inside a transaction, suppose I add expense that SKS paid 30 inr for coffee, the next step is to put 3 rows of 10 inr each of the 3 users in the split table but if server crashes before 2nd step, then the expense table has data that 30 inr are paid for coffee, but the split table doesnt have the members who were involved in it, it is an orphaned transaction, so we make these 2 steps as a single SQL transaction ->

```

BEGIN TRANSACTION; -- Tell the DB to wait before making it permanent

-- Step 1
INSERT INTO Expenses (amount, description) VALUES (30, 'Coffee');

-- Step 2
INSERT INTO Expense_Splits (user_id, amount) VALUES (Friend_A, 10);
INSERT INTO Expense_Splits (user_id, amount) VALUES (Friend_B, 10);

COMMIT; -- If everything above worked perfectly, save it permanently!

```


# Layered Backend Structure 
-> We will use a layered backend structure, as we dont want all the logic to be put in a single index.js file, using this architecture will make code more readable.

1. The Router Layer (/routes)
   - traffic controller, receives the HTTP request and passes to the controller
  
2. The Controllers Layer (/controllers)
   - extracts data from request, like trip_id from URL or the amount from the body and sends back a response, DOES NOT talk to the Database directly
  
3. The Services Layer (/services)
   - the logic for all the functions
   - allows calling some basic logic functions directly instead of using an HTTP requests

## Talking between PostgreSQL and Backend 
-> We have 2 options :

1. RAW SQL queries - we have 100% control over the performace, but can be tedious to write long and complex queries and then map the results to JavaScript objects.

2. Use an ORM like Prisma or Sequelize - fast to write, highly secure against SQL injection attacks, and very common in modern tech, but if a query is running slowly it can be tricky to debug due to SQL being hidden from us



## Using Neon.tech as our serverless postres rather than postgres locally
-> WHY ? 
I opted for a cloud-managed PostgreSQL instance instead of a local setup. This allowed me to decouple my database from my local machine, making it much easier to deploy the final backend to a service like Render or Heroku. It also mimics modern cloud-native architectures where databases are treated as external, scalable services. 

We are not using Supabase as we want to build our own backend, Neon provides us using postgres without running it locally and pairs well with prisma


# FLOW
-> Lets start with easy tasks of creating trips and users, first create the users as we need a user first who can create a trip. 
-> To handle user passwords, we dont store it directly in the DB, we will use bcrypt to hash them before they ever touch the DB, so that even if DB is compromised, only the hashed password is exposed.
-> After creating register and logic methods for user we then move to creating trips.


-> Creating a trip is not a simple CRUD query in DB, it needs 2 things to happen at same time:
    - we have to create the actual Trip record
    - also create a TripMember record that links the userid of creator to the new trip and gives the role of ADMIN so we have the permission to add expenses later.
If the 2nd step fails then we will have a Trip in DB with no ADMIN, we dont want that so we will combine these 2 steps using a Database Transaction, fulfills either both or none.


-> After creating the Trip methods, we can now succesfully create a trip and assign the creator of this trip as the ADMIN. Now we should implement feature for adding Trip Members to a particular trip and assigning them roles and another feature to fetch a user's entire travel dashboard. Also added feature to change the roles of a member and delete a member, by the ADMIN.


-> After finishing trip features, lets now move to Expense-Tracking features. Our expense splitting feature in backend accepts a split array containing the user involved and the amount they owe, we are keeping it lazy in backend but will make it smart in frontend, the user will enter total amount and the split members, will select option to split equally or split by amount and then can enter amount, if equally selected, we do the simple calculation of the individual amounts, and then pass the created split array to backend. This keeps our backend flexible that accepts amounts and just validates mathematical integrity.

-> Then we build a splitting algorithm, say A owes B X INR, B owes C X INR, A should just pay to C directly, this ensures we dont use a Directed graph strategy which scales badly, here's the strategy to build this mechanism :

1. Calculate the Net Balance: For every user, calculate (Total Amount they Paid) - (Total Amount they Owe).

2. Sort the Ledgers: If your balance is positive, you are a Creditor (people owe you money). If it is negative, you are a Debtor (you owe money).

3. The Greedy Match: We take the biggest Debtor and match them with the biggest Creditor, transferring money until everyone's balance is zero.

-> After splitting algo, we will work on integrating UPI with our app to enable user to pay to his friend directly from the app. We will also be integrating razorpay as a demo of integrating a payment gateway which will be used to unlocking premium features and usage limits. 

-> We need to update our DB schema to add an upi_id field to User model which will be used to redirect payments to. 

-> How to tell the DB that a transaction is settled ? 
We never delete old expenses/entries from the ledger, instead we create a "Settlement Transaction", an anti-expense, say A owes B 1500, so A had balance of -1500, B of +1500, after completing this transaction, we do A balance +1500 and B -1500, so now the total balance of both A and B is zero, which means now A doesnt B owe any money.

-> We will be building the razorpay premium firewall at the end after we have all the features so that we can easily decide where to place this firewall, currently there are no such features, so we will now move to the next phase of implementing the logistic features like itenaries and packing list.

-> Itenary features are simple CRUD operations.

-> For the packing list, we will have 2 modes, one for the group list where everyone shares like bluetooth speakers, cards, first-aid etc. and the other mode will be the personal list like phone charger, contact lenses. Later, we will integrate LLM which will look at the ItenaryEvents and will make a list according to those events for essentials and will put this response in UI .


-> Now we will move to the Live Polling feature. We have to handle a three-tier relational structure in DB:
1. The poll: The question (Ex - what day should we do surfing?) tied to specific trip_id
2. The poll option : The choices (Ex - Monday,Tuesday,Wednesday), a poll has many options
3. The vote : the table tracking which user_id voted for which option_id, must prevent one user from voting multiple options.

We will use a 2 layer approach for implementing this -
1. The REST layer - the frontend calls POST /vote and then refreshes the chart, this approach is clean, reliable, stateless.
2. The WebSocket layer - establish an open TCP connection, when user A votes, the server instantly blasts the updated results to everyone currently looking at the screen without needing them to refresh.

To keep our engineering clean, we first design the DB queries and REST to guarantee data integrity and then hook Socket.io on top of it.

-> For the websocket layer, our design will be like :
1. The trigger: user casts vote via normal POST method
2. The persist: the controller updates DB using upsert logic
3. The blast: right after DB confirms the write, our server grabs the active websocket connection for the specific tripId room and blasts out a simple event : "POLL_UPDATED"
4. The client reacts: every device open to that trip hears the broadcast and instantly refetches the updated vote counts in the background, zero manual screen refreshes required 


-> After socket.io polling feature, we will implement the vibe-check dashboard feature as all the necessary data for it has been created while creating itenary events we just need to process them.

-> Now we will implement an LLM service for all the additional features like packing-list, meeting-point and fill-the gap.

-> Using this LLM service, lets now implement the weather and itenary packing list feature. We have a PackingList table with an auto_generated_reason field. There are 3 tasks in order -
1. Gather the context - fetch the trip destination, the chronological itenary events and the weather forecast.
2. Consult the LLM - pass this data to LLM with a prompt and get JSON response.
3. Commit to DB - parse the AI response and bulk insert them in DB.


-> After this we can implement the "Fill the gap" feature, algo is 4 layer -
1. Fetches all events for a specific day
2. Loops through events and find any gaps b/w end_time of eventA and start_time of eventB that are more than 1 hour.
3. Grabs geospatial coordinates(lat,lng) of those surrounding events.
4. Passes the spatial-temporal window to LLM to suggest 2-3 low commitment, hyper local spots to kill time.

-> After this, we move to the "Meeting points" feature, we dont need LLM or DB for this functionality, no use in writing the locations of users every 3 secs in DB, we will be building a Transient Websocket room :
1. The trigger : 30 mins before a scheduled event, the frontend prompts users to share live location for this event.
2. The socket connection : if they click yes, their devices join a specific socket.io room.
3. The data stream : The device emits a payload like { userId: 123, lat: 15.38, lng: 73.83 }.
4. The broadcast : Your server acts as a pure mirror, instantly emitting that payload to everyone else in room so frontend map markers move in real time.
5. The cleanup : the room is destroyed as soon as event starts and data disappears forever, saving memory and protecting user privacy.

** BENEFIT of using websocket instead of a standard Express POST controller and saved them to your cloud PostgreSQL database, you would block your application threads with endless disk I/O operations, balloon your database storage, and incur heavy database connection bills.

By keeping the coordinate stream entirely in memory within Socket.io's transport layer, the server processes the incoming packets in a sub-millisecond memory pipeline and routes them right back out to the other clients. The network footprint remains exceptionally lean. 


-> Now, we will be dealing with the travelogue export feature. It will be a 3 tier architecture:
1. The binary ingestion layer (multer) - express cant natively read files sent from the frontend. We will use a middleware called multer to intercept incoming file stream and hold the file temporarily in server memory.
2. The cloud storage (cloudinary) - server will stream this file immediately to a third party object storage bucket called cloudinary, that saves the file and sends back a secure and permanent public image URL.
3. The relational ledger (prisma) - we save the URL inside DB TripMedia table linked to trip_id and the specific event_id.

**When the frontend request travelogue export we dont want to be hitting 10 different APIs for maps, events and photos, we will build a single highly optimised query that fetches the entire chronological journey in one go. It will look like :

```
export const getTravelogueData = async (tripId) => {
    return await prisma.itineraryEvent.findMany({
        where: { 
            trip_id: tripId,
            // Only grab events that actually have coordinates assigned
            NOT: { lat: null, lng: null } 
        },
        include: {
            media: {
                select: {
                    file_url: true,
                    uploader: { select: { name: true } }
                }
            }
        },
        orderBy: { start_time: 'asc' } // Traces the route chronologically!
    });
};
```


-> At the end we want to implement a premium firewall where we are integrating Razorpay. To build a secure  monetization layer, we will use a 3-way handshake architecture-

1. The paywall and order initiation - we intercept the trip creation flow, if a free user already has one trip we block them. To unlock it , we create an official bank verified order id from Razorpay's API and send it to frontend.

2.  The frontend overlay - the frontend takes the order id, opens the secure native razorpay checkout modal, collects the card/UPI details safely on Razorpay's infra and process the money.

3. The webhook firewall - once the bank approves the transaction, razorpay's cloud servers fire an asynchronous server-to-server alert (a webhook) to our backend. We cryptographically verify that this message actually came from Razorpay and instantly upgrade them from free to paid user in DB.

-> Now we will host our backend




*** UPDATES IN BACKEND ***
-> We need to add a route to get a trip details for a tripId, we currently only have routes for members, expenses, adding/removing events, packing list, polls, vibe check, fill the gap, travelogue, adding/deleting media items.

-> Update the ItenaryEvent schema to include a description, which will be generated by AI for fill-the-gap feature and update the system prompt in itenaryService to provide the no. of events based on the gaps found and provide actual events/locations at the place instead of generic outputs.

-> Update itenary service to fetch the Trip's location and feed to LLM to suggest accurate events, places name.

-> Update itenary service to take care of days with zero events.

-> Update media controller to just upload the URL given by multer middleware to DB as middleware automatically handles upload to cloudinary.

-> Updated cloudinary delete fxn to better handle URLs

-> Added new feature to attach an image to a specific event for the purpose of travelogue

-> Update Trip table to have lat,lng for global mapbox feature. We store only a destination string but will convert the destination string to lat,lng using a geocoding API.

-> Adding a GET route for getting all members who are part of a trip

-> Updating LLM service to use map/search grounding from gemini-2.5-flash to improve fill the gap feature to suggest events which are geographically close to each other

-> Updated userController -> registerUser to generate a jwt so that user doesnt need to enter email pass immediately again after creating account.

-> Improvinge the media upload pipeline to include q_auto (quality) and f_auto (format) optimisation which can help reduce image sizes by upto 80%. Initialise the storage with cloudinary and pass in q_auto and f_auto to upload optimised image directly and give the optimised image's url and store in DB, we can delete the uploadToCloudinary fxn in cloudinary.js and processMediaItem service fxn as uploading happens through the controller fxn and the storage initialised in cloudinary.js 
*But we want to implement role based access control (RBAC), and it was in the service fxn, so as we are deleting it, we need to add RBAC protection to the media upload route.