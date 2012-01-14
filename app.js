var express  = require('express')
  , jqtpl    = require('jqtpl')
  , mongoose = require('mongoose')
  , socketio = require('socket.io')

var app = module.exports = express.createServer()

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views')
    app.set('view engine', 'html')
    app.register('.html', jqtpl.express)
    app.use(express.bodyParser())
    app.use(express.cookieParser())
    app.use(express.methodOverride())
    app.use(express.session({ secret: "deadgoat" }))
    app.use(app.router)
    app.use(express.static(__dirname + '/public'))
})

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })) 
})

app.configure('production', function(){
    app.use(express.errorHandler()) 
})

// Database
mongoose.connect('mongodb://localhost/detective')

global.db = {}
var Schema = mongoose.Schema

// Database
var SuspectSchema = new Schema({
    name : String
})
var PlaceSchema = new Schema({
    name : String
})
var WeaponSchema = new Schema({
    name : String
})
var AnswerSchema = new Schema({
    name  : String
  , value : String
})

db.Suspect = mongoose.model('Suspect', SuspectSchema)
db.Place   = mongoose.model('Place', PlaceSchema)
db.Weapon  = mongoose.model('Weapon', WeaponSchema)
db.Answer = mongoose.model('Answer', AnswerSchema)

db.getSuspectData = function(cb){
    var suspects, places, weapons
    db.Suspect.find({}, function(err, results){
        suspects = results.map(function(o){ return o.name })
        db.Place.find({}, function(err, results){
            places = results.map(function(o){ return o.name })
            db.Weapon.find({}, function(err, results){
                weapons = results.map(function(o){ return o.name })
                cb(suspects, places, weapons)
            })
        })
    })
}

db.getAnswer = function(cb){
    var answer = {}
    db.Answer.find({ name: { $in: ['suspect', 'place', 'weapon'] } }, function(err, res){
        res.forEach(function(o){
            answer[o.name] = o.value
        })
        cb(answer)
    })
}

// Routes

app.get('/', function(req, res){
    res.render('index', {
        title: 'Watching'
    })
})

app.get('/admin', function(req, res){
    
    if (req.session && req.session.loggedIn){
        db.getSuspectData(function(suspects, places, weapons){
            res.render('admin', {
                title: 'Admin'
              , suspects: suspects
              , places: places
              , weapons: weapons
              , currentSuspect: null
              , currentPlace: null
              , currentWeapon: null
            })
        })
    } else {
        res.redirect('/login')
    }
})

app.post('/admin', function(req,res){
    
    db.Answer.findOne({ name: 'suspect' }, function(err, doc){
        doc.value = req.body.suspect
        doc.save()
    })
    
    db.Answer.findOne({ name: 'place' }, function(err, doc){
        doc.value = req.body.place
        doc.save()
    })
    
    db.Answer.findOne({ name: 'weapon' }, function(err, doc){
        doc.value = req.body.weapon
        doc.save()
    })
    // don't wait for DB
    res.redirect('/admin')
})

app.get('/login', function(req,res){
    res.render('login', {
        title: 'login'
    })
})

app.post('/login', function(req, res){
    if (req.body.user === 'admin' && req.body.password === 'deadgoat'){
        req.session.loggedIn = true
        res.redirect('/admin')
    } else {
        res.redirect('/login')
    }
})

app.get('/detective', function(req, res){
    
    db.getAnswer(function(answer){
        console.log(answer)
    })
    
    db.getSuspectData(function(suspects, places, weapons){
        res.render('detective', {
            title: 'Detective'
          , suspects: suspects
          , places: places
          , weapons: weapons
        })
    })
    
})


app.listen(3000)
io = socketio.listen(app)
io.set('log level', 2)

console.log("Express server listening on port %d", app.address().port)

// Sockets

function checkGuess(suspect, place, weapon, callback){
    /*
    A testemunha então responde com um número. Se a teoria estiver correta (assassino, local e arma corretos),
    ela responde 0. Se a teoria está errada, um valor 1,2 ou 3 é retornado. 1 indica que o assassiona está incorreto;
    2 indica que o local está incorreto; 3 indica que a arma está incorreta. Se mais de uma suposição está incorreta,
    ela retorna um valor arbitrário entre as que estão incorretos 
    */
    db.getAnswer(function(answer){
        var response = (function(){
            if (answer.suspect !== suspect) return 1
            if (answer.place !== place) return 2
            if (answer.weapon !== weapon) return 3
            return 0
        })()
        callback(response)
    })
}

var working = false

io.sockets.on('connection', function (socket) {
    socket.on('isWorking', function(name, cb){
        cb(working)
    })
    socket.on('workingStatus', function(){
        working = true
    })
    socket.on('saveItem', function (data) {
        var type = data.type[0].toUpperCase()+data.type.substring(1)
          , item = new db[type]
        item.name = data.name
        item.save(function(err){
            if (!err) console.log('saved', data)
        })
    })
    socket.on('deleteItem', function (data) {
        var type = data.type[0].toUpperCase()+data.type.substring(1)
        console.log(type)
        db[type].findOne({ name: data.name }).remove(function(err){
            console.log("removed", data)
        })
    })
    socket.on('guess', function (data, cb) {
        checkGuess(data.suspect, data.place, data.weapon, function(response){
            socket.broadcast.emit('newGuess', {
                suspect: data.suspect
              , place: data.place
              , weapon: data.weapon
              , response: response
            })
            cb(response)
        })
    })
})
