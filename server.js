const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const nedb = require("@seald-io/nedb");
const expressSession = require('express-session');
const nedbSessionStore = require('nedb-promises-session-store');
const bcrypt = require('bcrypt');

// configuration variables
let database = new nedb({
  filename: "database.txt",
  autoload: true,
});
const urlEncodedParser = bodyParser.urlencoded({
  extended: true
});
const upload = multer({
  dest: "public/uploads",
});

const nedbSessionInit = nedbSessionStore({
  connect: expressSession,
  filename: 'sessions.txt'
})

let userDatabase = new nedb({
  filename: 'userdb.txt',
  autoload: true
})

const app = express();
app.use(express.static("public"));
app.use(urlEncodedParser);
app.use(cookieParser());
app.use(
  expressSession({
    store: nedbSessionInit,
    cookie: {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year for the session
    },
    secret: "supersecret123",
  })
);
app.set("view engine", "ejs");

function requiresAuthentication(req, res, next) {
  if (req.session.loggedInUser) {
    // go to the next thing
    // goes to the route that the middleware is blocking
    next();
  } else {
    res.redirect("/login?error=true");
  }
}


app.get("/account", requiresAuthentication, async (request, response) => {

 
  if (request.session.loggedInUser) {
    // console.log(request.session.loggedInUser);
    // console.log(request.cookies.visits);
    if (request.cookies.visits) {
      let newVisit = parseInt(request.cookies.visits) + 1;
      response.cookie("visits", newVisit, {
        expires: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
    } else {
      response.cookie("visits", 1, {
        expires: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
    }

    try {
      let userData = await getUserData(request.session.loggedInUser);

      let query = {};

      let sortQuery = {
        timestamp: -1,
      };

     
      
      database
        .find(query)
        .sort(sortQuery)
        .exec((err, data) => {
          response.render("account.ejs", {
            posts: data,
            visitsToSite: request.cookies.visits,
            username: userData.username,
            firstName: userData.firstName,
            birthday: userData.birthday,
            canDrink: userData.canDrink,
            currentTime: '00000000',
            
          });
        });
    } catch (error) {
      console.error(error);
      response.redirect('/login');
    }
  } else {
    response.redirect('/login')
  }
})



app.get("/logout", (req, res) => {
  delete req.session.loggedInUser;
  res.redirect("/login");
});


app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.get('/21check', (req, res) => {
  res.render('21check.ejs');
});

app.get('/newpost', (req, res) => {
  res.render('newpost.ejs');
});

app.get('/margaritaville', (req, res) => {
  res.render('margaritaville.ejs');
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.get('/signup', (req, res) => {
  res.render('signup.ejs');
});

app.get('/slides', (req,res) => {
  res.redirect('https://www.google.com/')
})


app.get('/about', (req, res) => {
  res.render('about.ejs');
});

app.get('/disclaimer', (req, res) => {
  res.render('disclaimer.ejs');
});
// let docs;
let databaseData;
app.get('/recipes', (req, res) => {
  // Check if the user is logged in
  if (req.session.loggedInUser) {
    // User is logged in, fetch user data to determine if they are 21
    getUserData(req.session.loggedInUser)
      .then(userData => {
        // Determine if the user is 21
        let is21 = userData.canDrink;
        // Fetch the recipes data
        database.find({}, (err, docs) => {
          if (err) {
            console.error('Error finding documents:', err);
            return;
          }
          // Render the 'recipes.ejs' page and send the data
          res.render('recipes.ejs', { recipes: docs, is21: is21 });
        });
      })
      .catch(error => {
        console.error(error);
        // Redirect to login if there's an error retrieving user data
        res.redirect('/login');
      });
  } else {
    console.log("Damn the cookie aint working!!!")
    // User is not logged in, redirect to the '/21check' page
    res.redirect('/21check');
  }
});


app.get("/account", requiresAuthentication, async (request, response) => {
  if (request.session.loggedInUser) {
    // console.log(request.session.loggedInUser);
    // console.log(request.cookies.visits);
    if (request.cookies.visits) {
      let newVisit = parseInt(request.cookies.visits) + 1;
      response.cookie("visits", newVisit, {
        expires: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
    } else {
      response.cookie("visits", 1, {
        expires: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
    }

    try {
      let userData = await getUserData(request.session.loggedInUser);

      let query = {};

      let sortQuery = {
        timestamp: -1,
      };

     
      
      database
        .find(query)
        .sort(sortQuery)
        .exec((err, data) => {
          response.render("account.ejs", {
            posts: data,
            visitsToSite: request.cookies.visits,
            username: userData.username,
            firstName: userData.firstName,
            birthday: userData.birthday,
            canDrink: userData.canDrink,
            currentTime: '00000000',
            
          });
        });
    } catch (error) {
      console.error(error);
      response.redirect('/login');
    }
  } else {
    response.redirect('/login')
  }
})




// Function to determine if the user is 21 or not
function isUser21(birthdate) {
  let dateTest = getDateForBirthday();

  let birthyear = birthdate.slice(0, 4);
  let birthmonth = birthdate.slice(5, 7);
  let birthday = birthdate.slice(8, 10);

  let currentYear = dateTest.slice(0, 4);
  let currentMonth = dateTest.slice(5, 7);
  let currentDay = dateTest.slice(8, 10);

  let monthTest = birthmonth - currentMonth;

  // birthday is in current month
  if (monthTest == 0) {
    let dayTest = birthday - currentDay;
    // birthday has happened
    if (dayTest <= 0) {
      let yearTest = currentYear - birthyear;
      return yearTest > 20;
    }
    // birthday hasn't happened yet
    else if (dayTest > 0) {
      let yearTest = currentYear - birthyear - 1;
      return yearTest > 20;
    }
  }
  // birthday hasn't happened yet
  else if (monthTest > 0) {
    let yearTest = currentYear - birthyear - 1;
    return yearTest > 20;
  }
  // birthday already happened
  else if (monthTest < 0) {
    let yearTest = currentYear - birthyear;
    return yearTest > 20;
  }
}

// Now use this function in your route handler
app.post("/signup", upload.single("profilePicture"), (req, res) => {
  // Encrypting password so plain text is not stored in the database
  let hashedPassword = bcrypt.hashSync(req.body.password, 10);

  // Determine if the user is 21
  let is21 = isUser21(req.body.birthday);

  // Prepare data object to be inserted into the database
  let data = {
    username: req.body.username,
    fullname: req.body.fullname,
    password: hashedPassword,
    birthday: req.body.birthday,
    is21: is21,
  };

  // Add filepath if a file is uploaded
  if (req.file) {
    data.filepath = "/uploads/" + req.file.filename;
  }

  // Insert data into the database
  userDatabase.insert(data, (err, dataInserted) => {
    console.log(dataInserted);
    res.redirect("/login");
  });
});


app.post("/addRecipe", upload.single("image"), requiresAuthentication, async (req, res) => {
  if (req.session.loggedInUser) {
    // console.log(request.session.loggedInUser);
    // console.log(request.cookies.visits);
    if (req.cookies.visits) {
      let newVisit = parseInt(req.cookies.visits) + 1;
      res.cookie("visits", newVisit, {
        expires: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
    } else {
      res.cookie("visits", 1, {
        expires: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
    }
  console.log(req.body);
  console.log(Object.keys(req.body).length);
  let dataLength = Object.keys(req.body).length;
  let numberToTakeAway;
  let drink = false;
  let alcoholic = false;
  try{
    let userData = await getUserData(req.session.loggedInUser);

    console.log(userData);

    if (req.body.category == "Food"){
      numberToTakeAway = 5;
    }
    else{
      drink = true;
      numberToTakeAway = 6;
      alcoholic = req.body.alcoholCategory;
  
    }
    let ingredientLength = dataLength - numberToTakeAway;
    console.log(ingredientLength);
  
    let ingredientsArray = []
    for (let x = 1; x < ingredientLength + 2; x++){
      let key = "ingredient" + x;
      let ingredient = req.body[key];
      ingredientsArray.push(ingredient);
    }
  
    console.log(ingredientsArray);
    let data;
  if (drink == true){
    data = {
      name: req.body.recipeName,
      description: req.body.recipeDescription, 
      category: req.body.category,
      alcoholic: req.body.alcoholCategory,
      ingredients: ingredientsArray,
      instructions: req.body.recipeInstructions
      
    }
  }
    else{
      data = {
        name: req.body.recipeName,
        description: req.body.recipeDescription,
        category: req.body.category,
        ingredients: ingredientsArray,
        instructions: req.body.recipeInstructions
    };
  }

  data.username = userData.username;
  data.firstName = userData.firstName;
    
  
    if (req.file) {
      console.log("file uploaded!");
      data.filepath = "/uploads/" + req.file.filename;
    } else {
      console.log("no file uploaded");
    }
  
    // console.log(data);
  
    database.insert(data, (err, dataInserted) => {
      console.log(dataInserted);
      res.redirect("/account");
    });
  }
 catch (error) {
  console.error(error);
  res.redirect('/login');
}}else{
    res.redirect('/login')
  

}
})

app.post("/21CheckPost", (req, res) => {
  let dateOfBirth = req.body.birthday;
  let is21 = isUser21(dateOfBirth);

  res.cookie("visits", 1, {
    expires: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
  });

  // Fetch the recipes data
  let databaseData = database.find({}, (err, docs) => {
    if (err) {
      console.error('Error finding documents:', err);
      return;
    }
    // Render the recipes page and send the 'is21' status and the recipes data
    res.render("recipes.ejs", { is21: is21, recipes: docs });
  });
});

app.post("/authenticate", (req, res) => {
    let attemptLogin = {
      username: req.body.username,
      password: req.body.password
    }

    let searchQuery = {
      username: attemptLogin.username
    }

    userDatabase.findOne(searchQuery, (err, user) => {
      console.log("login attempted");
      if (err || user == null){
        res.redirect('/login');
        console.log('no user found');
      }
      else {
        console.log('found user');

        let encPass = user.password;

        if (bcrypt.compareSync(attemptLogin.password, encPass)){
          let session = req.session;
          session.loggedInUser = attemptLogin.username;

          console.log("successful login");

          res.redirect('/')
        }
        else{
          res.redirect('/login');
        }
      }
    });
});

function getUserData(loggedInUser) {
  return new Promise((resolve, reject) => {
    let searchQuery = {
      username: loggedInUser
    }

    userDatabase.findOne(searchQuery, (err, user) => {
      console.log("login attempted");
      if (err || user == null) {
        reject("No user found");
        console.log('no user found');
      } else {
        console.log('found user');
        let username = user.username;
        let firstName = user.fullname;
        let birthday = user.birthday;
        let canDrink = user.is21;
        resolve({ username, firstName, birthday, canDrink});
      }
    });
  });
}

app.get("/search", requiresAuthentication, (req, res) => {
  let searchTerm = req.query.searchTerm;

  let query = {
    name: new RegExp(searchTerm),
  };

  database.find(query, (err, searchedData) => {
    res.render("index.ejs", { posts: searchedData });
  });
});

app.get("/recipes/:id", (req, res) => {
  let id = req.params.id;
  let is21 = req.query.is21; // Extract the is21 query parameter from the URL
  console.log(is21);
  console.log(req.params)

  let data = {
    is21: is21
  }
  console.log(data)

  
  let query = {
    _id: id,
  };

  console.log(query);

  database.findOne(query, (err, individualPost) => {
    res.render("singlePost.ejs", { post: individualPost, data: data });
  });
});






function getDateForBirthday() {
  const date = new Date();
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  if (monthIndex < 10) {
    currentMonth = '0' + (monthIndex + 1);
  }
  else {
    currentMonth = monthIndex + 1
  }

  if (day < 10) {
    currentDay = '0' + day;
  }
  else {
    currentDay = day;
  }

  let dateIndex = (`${year}-${currentMonth}-${currentDay}`);
  console.log(dateIndex)
  return dateIndex;
}

// come back and finish this once I have the fun facts
function getFact() {
  const date = new Date();
  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  let dateIndex = (`${day}-${monthIndex + 1}`);
  console.log(dateIndex)
  return dateIndex;

}

const port = 6001
app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

