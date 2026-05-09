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
## Backend
   ### Login info
   - We chose to have login info be email and a user selected password
   - Login info would allow us to track specific apps of a user, enabling them to track multiple projects uptime metrics at the same time!
   - Having an email allows us to notify the user i their app goes down
  ### Why the choice was made
   - Email and password is standard information to collect from a user
   - We could have also asked for a username
    
   - Risk
      - Not a risk, but just not neccesary for the scope of the project.
  