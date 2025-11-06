const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const admin = require("firebase-admin");
const app = express()
require("dotenv").config()
const port = process.env.PORT||3000;



const serviceAccount = require("./prime-deals--firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


//middleware
app.use(cors())
app.use(express.json())

const verifyFirebaseToken = async(req,res,next)=>{
const authorization = req.headers.authorization;
if(!authorization){
    return res.status(401).send({message:"unauthorized access"})
}
const token  = authorization.split(' ')[1]
try{
const decoded =await admin.auth().verifyIdToken(token)
console.log('inside token',decoded)
req.token_email = decoded.email
next()
}
catch(error){
    return res.status(401).send({message:"unauthorized access"})
}
}

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.yh13yvx.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/',(req,res)=>{
res.send('smart deals server is running...')
})

async function run() {
  try {
    await client.connect();

        const db = client.db('smart_db')
        const productsCollection = db.collection('products')
        const bidCollection = db.collection('bids')
        const usersCollection = db.collection('users')
        //users api
        app.post('/users',async(req,res)=>{
            const newUser = req.body;
            const email = req.body.email;
            const query = {email:email}
            const existingUser = await usersCollection.findOne(query)
            if(existingUser){
                res.send('user already exists do not need to insert again')
            }
            else{
                 const result = await usersCollection.insertOne(newUser)
            res.send(result)
            }
           
        })
        //product api
        app.post('/products',verifyFirebaseToken,async(req,res)=>{
            console.log('headers in the post',req.headers)
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct)
            res.send(result)
        })

        //get
        // app.get('/products',async(req,res)=>{
        //     // const projectsFields = {_id:0,title:1,price_min:1,price_max:1,image:1}
        //     const cursor = productsCollection.find()
        //     // .sort({price_min: 1}).limit(5).project(projectsFields)
        //     const result = await cursor.toArray()
        //     res.send(result)
        // })

        //all product and my product 
             app.get('/products',verifyFirebaseToken,async(req,res)=>{
            const email =  req.query.email
            let query = {}
            if(email){
                 query = { seller_email: email };
            }
            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })
        //latest product apis
        app.get('/latest-product',async(req,res)=>{
            const cursor = productsCollection.find().sort({created_at:-1}).limit(6)
            const result = await cursor.toArray()
            res.send(result)
        })

        //get single user 
        app.get('/products/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id:new ObjectId(id)}
            const result = await productsCollection.findOne(query)
            res.send(result)
        })

        //delete
        app.delete('/products/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })

        //update
        app.patch('/products/:id',async(req,res)=>{
            const id = req.params.id;
            const query =  {_id: new ObjectId(id)}
            const updateProduct = req.body;
            const update = {
                $set:{
            title: updateProduct.title,
            min_price: updateProduct.price_min,
            max_price: updateProduct.price_max,
            image: updateProduct.image,
            description: updateProduct.description
                }
            }
            const option = {}
            const result = await productsCollection.updateOne(query,update,option)
            res.send(result)
        })

        //bid related api here
        app.post('/bids',verifyFirebaseToken,async(req,res)=>{
            const newBid = req.body;
            const result = await bidCollection.insertOne(newBid)
            res.send(result)
        })

        //sob bid pete gele
        app.get('/bids',async(req,res)=>{
            const email =  req.query.email
            let query = {}
            if(email){
                 query = { buyer_email: email };
            }
            const cursor = bidCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        //1ta product e kotogulu bid seta dekhar jonno 
        app.get('/products/bids/:productId',async(req,res)=>{
            const productId = req.params.productId;
            const query ={ product:productId}
            const cursor = bidCollection.find(query).sort({bid_price:-1})
            const result = await cursor.toArray()
            res.send(result)
        })

        //delete 
        app.delete('/bids/:id',async(req,res)=>{
            const id = req.params.id
            const query = {_id:new ObjectId(id)}
            const result = await bidCollection.deleteOne(query)
            res.send(result)
        })

        //search api 
        app.get('/search',verifyFirebaseToken,async(req,res)=>{
            const search_text =  req.query.search;
            const result = await productsCollection.find({title:{$regex:search_text,$options:'i'}}).toArray()
            res.send(result)
        })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
  }
}
run().catch(console.dir);

app.listen(port,()=>{
    console.log(`smart deal server is running port : ${port}`)
})