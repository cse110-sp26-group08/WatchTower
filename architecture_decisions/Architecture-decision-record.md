# Architecture-decision-record (ADR)

We will split the ADR into two sections, one for frontend, one for backend

## Frontend
### Chart.js
  - This part of the project is for displaying the metrics into graphs,tables, or charts.
  - These metrics might be number of times the app has gone down within the past 24 hours, number of found bugs, etc.
  - Chart.js only requires a json file as input(obviously of a specific format) then can be translated into 
### Why the choice was made

  - Chart.js is much simpler then alternatives we researched (Echarts)
  - Echarts allows for more graphs and customization but adds complexity
  - Chart.js was also chosen in the CSE 135 project as noted by Ki
  - Risks
    - Given that our project scope is small having more functionality and customization just increases the chance of rabbit holing 
  - For practicallity we wont need that many graphs so Chart.js fits our needs perfectly
### Color scheme
  - We chose a blue and white color scheme for every page on our website(includes login page, homepage, dashboard)
  - The blue is an arcade blue similar to the one that fits our teams theme from the google slides
### Why the choice was made
  - The frontend team decided that post hog's UI was very overloaded with colors and animations. We found this to be not very useful for an app that is just meant to track metrics and notify users of any outages
## Backend 
  - check [Backend architecture PDF](./architecture_backend.pdf) for more details on more detailed documentation for the backend and [Backend collector PDF](./collector.pdf)


   ### Login info
   - We chose to have login info be email and a user selected password
   - Login info would allow us to track specific apps of a user, enabling them to track multiple projects uptime metrics at the same time!
   - Having an email allows us to notify the user i their app goes down
  ### Why the choice was made
   - Email and password is standard information to collect from a user
   - We could have also asked for a username
    
   - Risk
      - Not a risk, but just not neccesary for the scope of the project.
   ### MongoDB
    - We would need MongoDB to store the login info.
    - Since our app won't be a full fledged production app, if MongoDB is not allowed we can switch to storing the info in SQLite.
    - Nikita took CSE 135 and suggested we use MongoDB
   ### Why the choice was made
   - The backend team was most famillar with MongoDB from past projects as opposed to other ways to store user information
   - We also had experince with using MongoDB from our slot machine app from Warmup 2
   - Risk  
    - We had some trouble with mongodb in our warmup, but as we became more experinced with MongoDB, our uncertainty around how to use MongoDB shrunk and I think everyone in the group is more comfortable with using it.
        
   ###  POST /api/collect — centralized collector endpoint 
    - This would be needed to collect the data that the UI/UX team has detailed would be needed as per their research and meeting with professor Powell.
   ### Why the choice was made 
   - Nikita drew from her experince from CSE 135 and said that this worked best for their watch-tower replication
  