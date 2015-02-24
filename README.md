# emnebrowser

emnebrowser is a web app for search, filtering and sorting courses at the [Norwegian University of Science and Technology](http://www.ntnu.edu/). A live version of the app is located at [emner.gløs.no](http://emner.xn--gls-1na.no/). emnebrowser allows you to, for instance, list all courses that offer 7.5 credits, is taught in the fall semester and doesn't have any mandatory activities. The data is retrieved from the [course API](http://www.ime.ntnu.no/api/) offered by the Faculty of Information Technology, Mathematics and Electrical Engineering at NTNU.

## Usage

To set up emnebrowser locally, you need to have node.js and RethinkDB installed. Run ```npm install``` in the project's root directory to install the required libraries, which includes express.js, async and request.

As some of the infrastructure is based on a previous project, the set up procedure is currently somewhat arcane. First, run ```node util/get.js```, which retrieves one JSON file for each course and saves them in the folder "courses". Next, run ```node setup_database.js```. At this point, you should have RethinkDB running on port 28015, as the script will connect to the database and insert the (heavily munged) course data.

When this is done, you can run ```node create_indexes.js``` to add indices to the RethinkDB database, which is basically required to achieve any kind of performance. Finally, ```node run.js``` will run emnebrowser on port 5002. To actually serve the page to the Internet, put Apache or nginx in front of node.js. Directly exposing node.js on port 80 is not recommended.
