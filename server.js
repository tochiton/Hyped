    var express = require('express');
    var sqlite = require('sqlite3');
    var cookieParser = require('cookie-parser');
    var session = require('express-session');
    var path = require('path');
    var app = express();
    var request = require('request');

    var fileUpload = require('express-fileupload');

    var mustache = require('mustache');
    var fs = require('fs');
    app.use(cookieParser());
    app.use(session({

        'store': new session.MemoryStore(),
        'secret': 'a secret to sign the cookie',
        'resave': false,
        'saveUninitialized': false,
        'cookie': {'maxAge': 10086400}
    }));

    var database = new sqlite.Database('database.sqlite');

    var bodyParser = require('body-parser')
    app.use( bodyParser.json() );       // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
        extended: true
    }));

    app.use(fileUpload());

    database.serialize(function() {
        database.run('PRAGMA foreign_keys = ON;');

        database.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                name TEXT,
                email TEXT,
                password TEXT,
                UNIQUE (email)
            );
        `);

        database.run(`
            CREATE TABLE IF NOT EXISTS friends(
                me INTEGER REFERENCES users (id),
                friend INTEGER REFERENCES users (id),
                UNIQUE(me, friend)
            );
        `);

        database.run(`
            CREATE TABLE IF NOT EXISTS votes(
                name VARCHAR(255) PRIMARY KEY,
                count INTEGER
            );
        `);

        database.run(`
            CREATE TABLE IF NOT EXISTS privateMessage(
                receiver TEXT,
                sender INTEGER
            );
        `);

        database.run('', function(objectError) {
            console.log('created tables');
        });
    });

    /************************************************************************/
    /************************************************************************/



    app.post('/signup.html', function(req, res) {


            var functionCheck = function () {
                database.all("SELECT * FROM users WHERE users.email = :email;",
                    {
                        ':email': req.body.email
                    },
                    function (objectError, objectRows) {
                        if (objectError !== null) {
                            functionError(String(objectError));
                        }
                        else {
                            if (objectRows.length === 0) {

                                functionInsert();
                            }
                            else {
                                res.sendFile(__dirname + '/www/mvp.html');
                            }
                        }
                    }
                )
            };
            var functionInsert = function () {
                database.run(`
                INSERT INTO users (name, email, password)
                VALUES (:name, :email, :password );
            `, {
                    ':name': req.body.username,
                    ':email': req.body.email,
                    ':password': req.body.password,
                }, function (objectError) {
                    if (objectError !== null) {
                        functionError(String(objectError));
                        return;
                    }
                    //console.log(this);
                    req.session.user = this.lastID;
                    functionSuccess();
                });
            };
            var functionError = function (strError) {
                res.status(200);
                res.set({
                    'Content-Type': 'text/plain'
                });
                res.write(strError);
                res.end();
            };

            var functionSuccess = function () {
                res.sendFile(__dirname + '/www/mvp.html');
            };
        functionCheck();


    });
    //*********************************************************************
    //*********************************************************************

    app.get('/getvotes', function(req, res) {
        //check for session and read info from the database

        /*if(!req.session.user){
            res.redirect('/login.html');
            return;
        }*/
        var objectUser = null;

        var functionUser = function() {
            // get user info from db, store this user in objectUser
            // call functionFile on success

            database.all("SELECT name, count FROM votes",
                {},
                function (objectError, objectRows) {
                    // check whether there was an error and handle it if necessary
                    // is objrectrows.length !== 1? if so, this is an error that needs to be handled
               //     console.log(objectRows);
                    objectUser = objectRows;
                    console.log(objectRows);
                    res.type('json');
                    res.json(objectUser);
                }
            );
        };

        functionUser();
        //var bb = JSON.stringify(objectUser);
        //res.json(objectUser);

        //res.json(objectUser);

    });


    //***********************************************************************
    //***********************************************************************

    app.post('/votes', function(req,res) {
    	/*if ( !req.session.user) {
    		res.redirect('/login.html');
    		return;
    	}*/

    	var name = req.body.name;
    	if ( ! name || ! name.length) {
    		return;
    	}
      console.log(name);

      var functionCheck = function () {
           database.all("SELECT * FROM votes WHERE votes.name = :name;",
               {
                   ':name': req.body.name
               },
               function (objectError, objectRows) {
                   if (objectError) {
                       //res.redirect('/login.html');
                       console.log("error");
                       res.send("error");
                   } else {
                       if (objectRows.length === 0) {
                           //res.redirect('/login.html');
                            console.log("before func insert");
                            functionInsert();

                       } else {
                           console.log("calling func increment");
                           functionIncrement();
                           //req.session.user = objectRows[0].id;
                          // res.sendFile(__dirname + '/www/mvp.html');
                       }
                   }
                   //res.end();
               }
           )
       };

       var functionIncrement = function () {
           database.run(`
           UPDATE votes SET count = count + 1 WHERE name=:name;
       `, {
               ':name': name,
           }, function (objectError) {
               if (objectError !== null) {
                   functionError(String(objectError));
                   return;
               }
               //console.log(this);
               //req.session.user = this.lastID;
               console.log("running func success");
               functionSuccess();
           });
       };


       var functionInsert = function () {
           database.run(`
           INSERT INTO votes (name, count)
           VALUES (:name, :count );
       `, {
               ':name': name,
               ':count': 1,
           }, function (objectError) {
               if (objectError !== null) {
                   functionError(String(objectError));
                   return;
               }
               //console.log(this);
               //req.session.user = this.lastID;
               console.log("running func success");
               functionSuccess();
           });
       };
       var functionError = function (strError) {
           res.status(200);
           res.set({
               'Content-Type': 'text/plain'
           });
           res.write(strError);
           res.end();
       };

       var functionSuccess = function () {
           //res.sendFile(__dirname + '/www/mvp.html');
          res.end();
       };

       functionCheck();
    });

    /************************************************************************/
    /************************************************************************/

    app.post('/login.html', function (req, res) {

        // select * from users where email = providedemail
        // examine returned row / data and compare the password from the database with the received password

        var functionCheck = function () {
            database.all("SELECT * FROM users WHERE users.email = :email AND users.password = :password;",
                {
                    ':email': req.body.email,
                    ':password': req.body.password
                },
                function (objectError, objectRows) {
                    if (objectError) {
                        res.redirect('/login.html');
                    } else {
                        if (objectRows.length === 0) {
                            res.redirect('/login.html');
                        } else {
                            req.session.user = objectRows[0].id;
                            res.sendFile(__dirname + '/www/mvp.html');
                        }
                    }
                }
            )
        };

        functionCheck();
    });

    /************************************************************************/
    /************************************************************************/
    app.post('/add', function (req, res) {

        // select * from users where email = providedemail
        // examine returned row / data and compare the password from the database with the received password
        console.log(req.session.user);
        console.log(req.body.adduser);
        var functionAdd = function () {
            database.run(`
                INSERT INTO friends (
                me,
                friend
                )VALUES (
                :me , (SELECT id FROM users WHERE name =:friend )
                );
            `, {
                ':me': req.session.user,
                ':friend': req.body.adduser,
            }, function (objectError) {
                if (objectError !== null) {
                    functionError(String(objectError));
                    return;
                }
                functionSuccess();
                //console.log(this);
             //   req.session.user = this.lastID;
            });
        };
        var functionError = function (strError) {
            res.status(200);
            res.set({
                'Content-Type': 'text/plain'
            });
            res.write(strError);
            res.end();
        };
        var functionSuccess = function() {


            res.redirect('/index.html');

            res.end();
        };
        functionAdd();
    });

    /************************************************************************/
    /************************************************************************/
    app.get('/mvp.html', function(req, res) {
        //check for session and read info from the database
  //      console.log(req.session);

        if(!req.session.user){
            res.redirect('/login.html');
            return;
        }
        else{
            res.redirect('/mvp.html');
            return;
        }

        var objectUser = null;

        var functionUser = function() {
            // get user info from db, store this user in objectUser
            // call functionFile on success

            database.all("SELECT * FROM users WHERE users.id = :id;",
                {
                    ':id': req.session.user
                },
                function (objectError, objectRows) {
                    // check whether there was an error and handle it if necessary
                    // is objrectrows.length !== 1? if so, this is an error that needs to be handled

                    objectUser = objectRows[0];
                   // console.log(objectUser);
                    functionFile();
                }
            );
        };

        var strFile = null;


       // functionUser();
    });

    /************************************************************************/
    /************************************************************************/

    app.get('/displaylist.html', function(req, res) {
        //check for session and read info from the database

      //  console.log(req.session);
        if(!req.session.user){
            res.redirect('/login.html');
            return;
        }

        var objectUser = null;

        var functionUser = function() {
            // get user info from db, store this user in objectUser
            // call functionFile on success

            database.all("SELECT name, count FROM votes",
                {},
                function (objectError, objectRows) {
                    // check whether there was an error and handle it if necessary
                    // is objrectrows.length !== 1? if so, this is an error that needs to be handled
               //     console.log(objectRows);
                    objectUser = objectRows;
                    console.log(objectRows);
                    functionFile();
                }
            );
        };

        var strFile = null;

        var functionFile = function() {
            // read index.html
            // call functionmustache on success

            fs.readFile(__dirname + '/www/displaylist.html', function(err, data) {
                strFile = data.toString();

                functionMustache();
            });
        };

        var functionMustache = function() {
            // render and send out

            res.writeHead(200, {
                'Content-Type': 'text/html'
            });

            res.write(mustache.render(strFile, {
                'user': objectUser
            }));

            res.end();
        };

        functionUser();
    });

    /************************************************************************/
    /************************************************************************/

    app.get('/search.html', function(req, res) {
        res.status(200);
        res.set({
            'Content-Type': 'application/json'
        });

        res.write('<!DOCTYPE html><html><body>lorem ipsum</body></html>');
        res.end();
    });


    /************************************************************************/
    /************************************************************************/

    app.post('/loadFile.html', function(req, res) {
        var sampleFile;

        if (!req.files) {
            res.send('No files were uploaded.');
            return;
        }

        sampleFile = req.files.sampleFile;
        console.log(sampleFile);
        var destination = '';
        destination  = '/images/'+ sampleFile.name;

        var addFile = function () {
            database.run(`
                INSERT INTO files (me, filename)
                VALUES (:me, :filename );
            `, {
                ':me': req.session.user,
                ':filename': destination,
            }, function (objectError) {
                if (objectError !== null) {
                    functionError(String(objectError));
                    return;
                }
                //console.log(this);
                functionSuccess();
            });
        };
        var functionError = function (strError) {
            res.status(200);
            res.set({
                'Content-Type': 'text/plain'
            });
            res.write(strError);
            res.end();
        };

        var temp = '';
        temp = '/www' + destination;

        var functionSuccess = function () {
            console.log(destination);

            sampleFile.mv(__dirname + temp , function(err) {
                if (err) {
                    res.status(500).send(err);
                }
                else {
                   // res.send('File uploaded!');
                    res.redirect('/index.html');
                }
            });
        };

        addFile();
    });

    /************************************************************************/
    /************************************************************************/

    app.get('/photos.html', function(req, res) {
        //check for session and read info from the database
        //      console.log(req.session);

        if(!req.session.user){
            res.redirect('/login.html');
            return;
        }

        var objectUser = null;

        var functionUser = function() {
            // get user info from db, store this user in objectUser
            // call functionFile on success

            database.all("SELECT * FROM files WHERE files.me = :id;",
                {
                    ':id': req.session.user
                },
                function (objectError, objectRows) {
                    // check whether there was an error and handle it if necessary
                    // is objrectrows.length !== 1? if so, this is an error that needs to be handled

                   // objectUser = objectRows[0];
                    objectUser = objectRows;
                    console.log(objectUser);
                    functionFile();
                }
            );
        };

        var strFile = null;

        var functionFile = function() {
            // read index.html
            // call functionmustache on success

            fs.readFile(__dirname + '/www/pictures.html', function(err, data) {
                strFile = data.toString();

                functionMustache();
            });
        };

        var functionMustache = function() {
            // render and send out

            res.writeHead(200, {
                'Content-Type': 'text/html'
            });

            res.write(mustache.render(strFile, {
                'user': objectUser
            }));

            res.end();
        };

        functionUser();
    });

    /************************************************************************/
    /************************************************************************/

    app.get('/friends', function(req, res) {
        //check for session and read info from the database
        //      console.log(req.session);

        if(!req.session.user){
            res.redirect('/login.html');
            return;
        }

        var objectUser = null;

        var functionUser = function() {
            // get user info from db, store this user in objectUser
            // call functionFile on success

            database.all("SELECT * FROM friends JOIN users AS me ON (friends.me = me.id) JOIN users AS friend ON (friends.friend = friend.id) WHERE me.id =:id ;",
                {
                    ':id': req.session.user
                },
                function (objectError, objectRows) {
                    // check whether there was an error and handle it if necessary
                    // is objrectrows.length !== 1? if so, this is an error that needs to be handled

                    objectUser = objectRows;
                    // console.log(objectUser);
                    functionFile();
                }
            );
        };

        var strFile = null;

        var functionFile = function() {
            // read index.html
            // call functionmustache on success

            fs.readFile(__dirname + '/www/friends.html', function(err, data) {
                strFile = data.toString();

                functionMustache();
            });
        };

        var functionMustache = function() {
            // render and send out

            res.writeHead(200, {
                'Content-Type': 'text/html'
            });

            res.write(mustache.render(strFile, {
                'user': objectUser
            }));

            res.end();
        };

        functionUser();
    });

    app.get('/logout', function(req, res) {

        req.session.destroy();

        res.redirect('/login.html');
    });

    /************************************************************************/
    /************************************************************************/

    app.post('/sendtext', function(req, res) {

        var sendPrivateText = function () {
            database.run(`
                INSERT INTO privateMessage (
                receiver,
                sender
                )VALUES (
                :receiver, (SELECT id FROM users WHERE name =:sender )
                );
            `, {
                ':receiver': req.body.message,
                ':sender': req.body.destination,
            }, function (objectError) {
                if (objectError !== null) {
                    functionError(String(objectError));
                    return;
                }
                //console.log(this);
                functionSuccess();
            });
        };
        var functionError = function (strError) {
            res.status(200);
            res.set({
                'Content-Type': 'text/plain'
            });
            res.write(strError);
            res.end();
        };

        var functionSuccess = function () {
            res.redirect('/index.html');
            res.end();
        };
        sendPrivateText();


    });


    /* -------------------------------------------------------------------  */
    /* -------------------------------------------------------------------  */
    var url = 'http://api.sportradar.us/ncaafb-t1/2016/REG/2/ISU/IOW/roster.json?api_key=tvbxck4wb9aasb3png3mbwcn';

    var homeTeam = [];
    var awayTeam = [];

    function logName(element, index, array){
        if(index < 30)
            homeTeam.push('<li class="list-group-item">'+element.name_full+'</li>');
    }

    function logName2(element, index, array){
        if(index < 30)
            awayTeam.push('<li class="list-group-item">'+element.name_full+'</li>');
    }


    request.get(url, (err, response, body) => {
        if(!err && response.statusCode === 200){
        var jsontext = body.replace(/\//ig, '');
        var data = JSON.parse(jsontext);
        data.home_team.players.forEach(logName);
        data.away_team.players.forEach(logName2);
        homeTeam = homeTeam.join('');
        awayTeam = awayTeam.join('');
    }
    else{
        console.log('no_data');
    }
    });


    app.get('/list',(req, res) => {
        res.send({
        homeTeam,
        awayTeam
    });
    });

    /*
    app.get('/mvp.html', (req, res) => {
        res.sendFile(__dirname + "/mvp.html");
    });
*/




    /* -------------------------------------------------------------------  */
/* -------------------------------------------------------------------  */
    app.use('/', express.static('./www/'))

    app.listen(process.env.PORT || 8080);
