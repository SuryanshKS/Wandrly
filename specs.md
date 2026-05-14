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
  
2. "Trips" Table - the group
   - id (UUID, primary key)
   - title, destination, startDate, endDate
   - public_share_token(for the travelogue export)

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


