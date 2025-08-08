# Monorepo for ChordZap

# Iter2:

## Implemented: 
- Music detection based on real-time audio using ACRloud's music recognition API. 
- In this iteration, I focused on integrating the audio recognition api. This then has a fallback to the mock page until the scraper is implemented. Listen page now has a period of time to listen to a song, request from the api, and displays whether analysis was successful in the console. Switched to axios for form-data package for multipart requests.

## ToDo:
- Create tabscraping logic and test
- Chord storage and segmentation in the database logic
- UI logic for listening and get the api for retriving a song to work



## Console api request
<img width="1508" height="364" alt="Screenshot 2025-08-08 at 12 30 08 AM" src="https://github.com/user-attachments/assets/2a842561-8b67-45ac-ab55-030d346d3719" />



# Iter1
## Implemented: 
- Created a foundation for a shazam style chord view web application. Theres a fully fucnitonal backend and front end. The backend was made using Typescript and Express.js. It is also connected to a MongoDB with API endpoints. The schema includes, song models with chord information, artist details, and meta data. The front end is a react application that provides a UI with 4 main screens - shown below. This implementation includes custom hooks for audio capture, song detection, and tab search.

## ToDo:
- API integration for song detection
- Spotify Integration ? maybe through auth - not sure if this is viable yet
- DB population with actual user/song data instead of mock
- scraper for Ultimate Guitar tabs at minimum
- unit testing for api end points and components

## home page 
<img width="1711" height="1296" alt="Screenshot 2025-08-01 at 3 17 34 PM" src="https://github.com/user-attachments/assets/b281bb72-17a5-4cbf-b7a5-a2b61ad9e714" />

## listening page with microphone request prompt
<img width="1695" height="1288" alt="Screenshot 2025-08-01 at 3 18 27 PM" src="https://github.com/user-attachments/assets/f13ad297-43bd-4f0f-82fe-bcc0664d89e7" />

## listening action page
<img width="1682" height="1286" alt="Screenshot 2025-08-01 at 3 18 36 PM" src="https://github.com/user-attachments/assets/9075f2f2-8582-4131-8115-5f680d146497" />

## Mock song pulled page
<img width="1680" height="1274" alt="Screenshot 2025-08-01 at 3 22 44 PM" src="https://github.com/user-attachments/assets/b77fea43-638e-4a9d-91fb-f11b29c63e3d" />

## chord diagram page
<img width="1648" height="1280" alt="Screenshot 2025-08-01 at 3 22 50 PM" src="https://github.com/user-attachments/assets/15affda0-a71a-4bc1-a959-0286bcbd0743" />

## future sheet music from scraper page
<img width="1708" height="1245" alt="Screenshot 2025-08-01 at 3 22 57 PM" src="https://github.com/user-attachments/assets/dc9e7f2c-3888-4b22-84fc-12f7fb2060c7" />
