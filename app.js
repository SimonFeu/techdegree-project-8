/*************************************************  
  Loading the required data to use Sequelize
*************************************************/

const db = require("./db");
const { sequelize } = db;
const { Book } = db.models;
const book = require("./db/models/Book");

/****************************************************************************************
      Handler function 
*****************************************************************************************
  Handler function to wrap each route. 

  Error-Handling - SequelizeValidationError
    If error.name is equal to "SequelizeValidationError" a message should appear on 
    the page.Two pages must be considered here. 
    The page for the "new-book" and the page for "update-book". 
    If the url contains "/new/book" then the "new-book.pug" is rendered. If the url not 
    contains "/new/book" then the "update-book.pug" is rendered. The "req.body" 
    values are selected and will  be transferred to the pug variables which then create 
    the values for the input fields  on the page. The property "alert" is used for the 
    test condition. If it is "true" the "alert.pug" is included in the page.
    For the page "update-book" there is also the property "id" needed. This is read
    from the URL via the substring()-method.

  Error-Handling - not a SequelizeValidationError
    If error.name is not equal to "SequelizeValidationError" a 500 status is send to the
    console and the "error.pug" is rendered.
*****************************************************************************************/

function asyncHandler(cb) {
  return async (req, res, next) => {
    try {
      await cb(req, res, next);
    } catch (error) {
      //when an error occurs
      if (error.name === "SequelizeValidationError") {
        if (req.url == "/books/new") {
          res.render("new-book", {
            title: req.body.title,
            author: req.body.author,
            genre: req.body.genre,
            year: req.body.year,
            alert: true,
          });
        } else {
          res.render("update-book", {
            book: {
              id: req.url.substring(7),
              title: req.body.title,
              author: req.body.author,
              genre: req.body.genre,
              year: req.body.year,
            },
            alert: true,
          });
        }
      } else {
        res.status(500).render("error");
      }
    }
  };
}

/**************************************************************************** 
    Express
*****************************************************************************
  > Loads the express module into the application
  > creating an express application with "express();"
*****************************************************************************/

const express = require("express");
const app = express();

/**************************************************************************** 
    body-parser
*****************************************************************************
  > Body-parse is needed to convert the body of the request into a JSON object.
    It is not possible to work with the queried data before
  > Loading body-parse model 
  > Telling express to use the body-parser model as middleware
*****************************************************************************/

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

/**************************************************************************** 
    PUG
*****************************************************************************
  > tells express that it should use "pug"
  > this code tells which templet engine to use
  > by default express will search for templets in the folder "views"
*****************************************************************************/

app.set("view engine", "pug");

/**************************************************************************** 
    Static files
*****************************************************************************
  > this is used to add the static css files to the page
*****************************************************************************/

app.use("/static", express.static("public"));

/****************************************************************************
                                   GET-Routes
****************************************************************************/

//redirects to route "/books"
app.get(
  "/",
  asyncHandler(async (req, res) => {
    res.redirect("/books");
  })
);

//returns all the data from the database
app.get(
  "/books",
  asyncHandler(async (req, res) => {
    const books = await Book.findAll();
    res.render("index", { books: books });
  })
);

//renders the create new book form.
app.get("/books/new", (req, res) => {
  res.render("new-book");
});

/*
returns the data of a specific book which is searched through the id value
which is transmitte through /books/:id. Then it renders the form of the
update-book.pug and transfers the data to the pug file.
There the data is inserted into the values of the input fields.
*/
app.get("/books/:id", async (req, res) => {
  const book = await Book.findByPk(req.params.id);
  res.render("update-book", { book: book });
});

/****************************************************************************
                                   POST-Routes
****************************************************************************/
//Op is needed to use the "like" Operator in the finder method of the select query
const { Op } = require("sequelize");

/*
This post route is used, to search in the database. It uses the values of
the "req.body.search" as search value. The value can be a part of a title,
author, genre or year. So we use the "Op.or" Method to set or-filters.
Also we use the "Op.like" method, so that a search value can also be a
substring of the properties title, author, genre or year.
*/
app.post(
  "/",
  asyncHandler(async (req, res) => {
    //raw is set to true to only receive "dataValues" from the database
    const search = req.body.search;
    const books = await Book.findAll({
      where: {
        [Op.or]: [
          {
            title: {
              [Op.like]: "%" + search + "%",
            },
          },
          {
            author: {
              [Op.like]: "%" + search + "%",
            },
          },
          {
            genre: {
              [Op.like]: "%" + search + "%",
            },
          },
          {
            year: {
              [Op.like]: "%" + search + "%",
            },
          },
        ],
      },
    });

    res.render("index", { books: books });
  })
);

//Creates a new book and saves it to the database and then redirects to the the books listing page
app.post(
  "/books/new",
  asyncHandler(async (req, res) => {
    await Book.create(req.body);
    res.redirect("/books");
  })
);

//Updates the data of the selected book and then redirects to the the books listing page
app.post(
  "/books/:id",
  asyncHandler(async (req, res) => {
    console.log(req.body);
    const book = await Book.findByPk(req.params.id);
    await book.update(req.body);
    res.redirect("/");
  })
);

//Deletes the selected book if the alert box is confirmed and then redirects to the books listing page
app.post("/books/:id/delete", async (req, res) => {
  const book = await Book.findByPk(req.params.id);
  await book.destroy();
  res.redirect("/books");
});

/****************************************************************************
                                   Error-Handlers
****************************************************************************/

//Initializing a 404-Handler
app.use((req, res, next) => {
  console.log("404");
  res.status(404).render("page-not-found");
});

//Initializing a Global Error-Handler
app.use((err, req, res, next) => {
  if (err.status === 404) {
    res.status(404).render("page-not-found");
  } else {
    res.status(err.status || 500).render("error");
  }
});

/****************************************************************************
              Setting up the Server / the tables of database 
****************************************************************************
Setup a server with the environment variable PORT  or  3000 as port number
That command "sequelize.sync() "creates new tables according to the schema 
specified in the model.
*****************************************************************************/
const port = process.env.PORT || 3000;
sequelize.sync().then(function () {
  app.listen(port, () => {
    console.log("The application is running on localhost:3000");
  });
});
