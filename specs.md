# Travel Itenary Planner Application - Wandrly

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