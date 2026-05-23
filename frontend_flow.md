# Travel Itenary Planner Application - Wandrly FRONTEND

1. We will be using nextjs(app router) for fast page loads, automatic image optimisation(perfect for cloudinary integration) and a robust routing system.
2. Styling will be done using TailwindCSS and shadcn.
3. For smoothness we will use Framer motion which provides some amazing animations.
4. We have a travelogue feature which displays map, for that we will use Mapbox GL JS.
5. Data manager - TanStack query (react query) which will connect to our render api, it caches data and gives a seamless feel.


-> Start with the auth screens. We are going to use Route Groups. In the Next.js App Router, wrapping a folder name in parentheses—like (auth)—tells the framework to group those routes logically without adding "auth" to the actual URL. This means your files will live in src/app/(auth)/login, but the user will see a clean wandrly.com/login.

-> Build the register and logic pages. Make them client side. While logging in,  we push the JWT access token to the localstorage, which the frontend can check before loading any authorized pages like the dashboard.

-> Now we build the dashboard page, where we are redirected to after successfull auth. When loading first it checks if wandrly_token exists in the localstorage, if not then direct the user to login screen.

-> On dashboard we add the create new trip button. Creating a trips folder inside dashboard folder, and a dynamic routing folder called [id], which will contain the trip page. The dynamic routing page [id] will take id from the url and fetch data of the trip.

-> This [id] page for a trip will have 2 main features :
1. The smart itenary tab which is the fill-the-gap feature we made in backend. We will simply add our trip events here and AI will suggest fill-the-gap events.
2. The AI packing list feature which contains both the AI suggested list and our own custom list.
We already have backend structure in place for these features.

-> This page will also have a View Travelogue button which will display all media for current trip in a gallery format.

-> Next we will implement the mapbox globe feature, but using Leaflet + openstreetmap

-> We build the travelogue timeline

-> Next we build the vibe check pacing dashboard

-> Implement the user invite,edit role and remove member features

-> Implementing the Edit Event feature

-> Adding typeahead search for adding destination in a trip

-> Implementing the expense features

-> Implementing the Poll feature

-> Implementing the Meeting point feature, the only backend involved here is socket.io, we will use react-leaflet and browser's geolocation API.

-> Fixes : change spin loading animation to skeleton window

-> Integrating backend razorpay gateway for premium trip creation.

-> Adding export PDF feature to get itenary and items list in PDF.