const express = require('express');
const app = express();
const path = require('path');
const dedupe = require('dedupe');
const MongoClient = require('mongodb').MongoClient;

// the port to listen on 
const listenPort = 8080;

// connection URI
const url = 'mongodb://mongodb:27017';

// database name
const dbname = 'governet';
var _db;

// Intentionally circumvent web security to make my life developing this easier in the short term
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Get Committee Information from the Database
app.get(['/committee','/committee/:committeeID'], (req, res) => {
    var query = {}
    if (req.params.cmteID){query["CMTE_ID"] = req.params.cmteID};
    if (req.query.cmteID){query["CMTE_ID"] = req.query.cmteID};
    if (req.query.candID){query["CAND_ID"] = req.query.candID};

    _db.collection("cm").find(query).toArray((err, result)=>{
        if (err) throw err;
        res.json(result);
    });
});

// Get Candidates from the Database
app.get(['/candidate','/candidate/:candID'], (req, res) => {
    // this seems like a really redundant and clunky way to query the DB via the endpoint; what's a better way to approach this??
    var query = {}
    // the cand ID will be the most frequent targeted search; use the param for this; everything else is a query
    if (req.params.candID){query["CAND_ID"] = req.params.candID};
    if (req.query.year && req.query.year !== 'all'){query["CAND_ELECTION_YR"] = parseInt(req.query.year)};
    if (req.query.state && req.query.state !== 'all'){query["CAND_ST"] = req.query.state};
    if (req.query.candOffice){query["CAND_OFFICE"] = req.query.candOffice};
    if (req.query.district){query["CAND_OFFICE_DISTRICT"] = req.query.district};
    if (req.query.party){query["CAND_PTY_AFFILIATION"] = req.query.party};
    if (req.query.city){query["CAND_CITY"] = req.query.city};
    if (req.query.zip){query["CAND_ZIP"] = req.query.zip};

    console.log(req.query);

    _db.collection("cn").find(query)./*project({CAND_ID: 1, CAND_NAME: 1}).*/toArray((err, result) => {
        if (err) throw err;
        res.json(result);
    })
});

app.get(['/contribution','/contribution/:candID'], (req, res) => {
    // this seems like a really redundant and clunky way to query the DB via the endpoint; what's a better way to approach this??
    var query = {}
    // the cand ID will be the most frequent targeted search; use the param for this; everything else is a query
    if (req.params.candID){query["CAND_ID"] = req.params.candID};
    if (req.query.cmteID && req.query.cmteID !== "all"){query["CMTE_ID"] = req.query.cmteID};
    if (req.query.candID && req.query.candID !== "all"){query["CAND_ID"] = req.query.candID};

    console.log(req.query);

    _db.collection("pas2").find(query).toArray((err, result) => {
        if (err) throw err;
        console.log(result);
        res.json(result);
    })
});

// Get Operational Exepnditures for Committees from the Database
app.get('/oppexp/:committeeID', (req, res) => {
    _db.collection("oppexp").find({}).toArray((err, result) => {
        if (err) throw err;
        res.json(result);
    })
});

// 
app.get('/api/graph/candidate/:candidateID', (req, res) => {
    _db.collection("cn").find({}).toArray((err,result) => {
        if (err) throw err;
        var result = result.map((candidate, index, array)=>{
            return {name: candidate.CAND_NAME, id: candidate.CAND_ID}
        })
        res.json(result);
    })
})

app.get('/api/graph/committee/:committeeID', (req, res) => {
    _db.collection("cm").find({}).toArray((err,result) => {
        if (err) throw err;
        var result = result.map((committee, index, array)=>{
            return {name: committee.CMTE_NM, id: committee.CMTE_ID}
        })
        res.json(result);
    })
})

app.post('/api/graph/contribution/:candID', (req, res) => {
    //query = {TRANSACTION_AMT: {$gt: 500}};
    // get the candidate id from the url, if it's there
    //if (req.params.candID){query["CAND_ID"] = req.params.candID};

    // Empty values for the graph options and data, to be populated below
    var graph = {};
    var nodes = [];
    var links = [];
    var categories = []

    // Empty values for processing data
    var candidates = [];
    var committees = [];
    var secondaryCandidates = [];

    var primaryCandidateCategory = {name:"Primary Candidate","keyword":{},"base":"Primary Candidate", "itemStyle":{"color":"#9D5C63"}, "label":{"color":"black"}}
    var candidateCategory = {name:"Candidate","keyword":{},"base":"Candidate", "itemStyle":{"color":"#FEF5EF"}, "label":{"color":"black"}}
    var committeeCategory = {name: "Committee","Keyword":{},base:"Committee", "itemStyle":{"color":"#3E92CC"}, "label":{"color":"black"}}
    categories.push(primaryCandidateCategory, candidateCategory, committeeCategory);
    graph['categories'] = categories;

    //add the requested candidate to the nodes list
    nodes.push({name: req.params.candID, id: req.params.candID, value: 1, category: 0});
    // Get the graph edges between a given candidate and the committees who have contributed to that candidate

    // those links that have been processed; for filtering unique objects based on contribution id
    var processed = {};
    var processed_candidates = {};

    // look up contributions to that candidate in the database

    function getCandidateLinks(){
        return _db.collection("pas2").aggregate([
            {
                $match:
                    {
                        $and:
                            [
                                {
                                    "CAND_ID": 
                                    {
                                         $eq: req.params.candID 
                                    },
                                    "TRANSACTION_AMT" : 
                                    {
                                        $gt: 500
                                    }
                                }
                            ]
                    }
            },
            {
                $lookup:
                    {
                        from:"cm", 
                        localField:"CMTE_ID", 
                        foreignField:"CMTE_ID", 
                        as:"CMTE_IDS"
                    }
            },
            {
                $lookup:
                {
                    from: "cn",
                    localField: "CAND_ID",
                    foreignField: "CAND_ID",
                    as: "CAND_INFO"
                }
            },
            {
                $unwind:
                    "$CMTE_IDS"
            },
            {
                $unwind:
                    "$CAND_INFO"
            },
            {
                $project:
                    {
                        CMTE_ID: 1, 
                        CAND_ID: 1, 
                        TRANSACTION_AMT: 1, 
                        CMTE_NM: "$CMTE_IDS.CMTE_NM",
                        CAND_NM: "$CAND_INFO.CAND_NAME"
                    }
            }
        ]).toArray();    
    }

    function getCommitteeLinks(committee_list, cand_id){
        return _db.collection("pas2").aggregate([
            {$match:
                {
                    $and:
                        [
                            {
                                "CMTE_ID" : 
                                {
                                    $in: committee_list
                                },
                                "CAND_ID" :
                                {
                                    $ne: req.params.candID
                                },
                                "TRANSACTION_AMT" : 
                                {
                                    $gt: 5000
                                }
                            }
                        ]
                }
            },
            {
                $lookup:
                    {
                        from:"cm", 
                        localField:"CMTE_ID", 
                        foreignField:"CMTE_ID", 
                        as:"CMTE_IDS"
                    }
            },
            {
                $lookup:
                {
                    from: "cn",
                    localField: "CAND_ID",
                    foreignField: "CAND_ID",
                    as: "CAND_INFO"
                }
            },
            {
                $unwind:
                    "$CMTE_IDS"
            },
            {
                $unwind:
                    "$CAND_INFO"
            },
            {
                $project:
                    {
                        CMTE_ID: 1, 
                        CAND_ID: 1, 
                        TRANSACTION_AMT: 1, 
                        CMTE_NM: "$CMTE_IDS.CMTE_NM",
                        CAND_NM: "$CAND_INFO.CAND_NAME"
                    }
            }
        ]).toArray();    
    }

    function processCandidate(committee_records){
        links = (
            links.concat(
                committee_records
                // map the contributions to a given candidate to just the cand id and committee ID
                .map((contribution, index, array) => {
                    if (!processed[contribution.CMTE_ID]){
                        console.log("CMTE NM: " + contribution.CMTE_NM)
                        console.log(contribution)
                        processed[contribution.CMTE_ID] = true;
                        nodes.push({name:contribution.CMTE_NM, id: contribution.CMTE_ID, value: 1, category: 2});
                        committees.push(contribution.CMTE_ID);
                        //return {contribution_id: contribution.CMTE_ID + contribution.CAND_ID, cmte_id: contribution.CMTE_ID, cand_id: contribution.CAND_ID}
                        return {source: contribution.CMTE_ID, target: contribution.CAND_ID};
                    }
                    return false;
                })
            )
        )
    }

    function processCommittees(committee_records){
        links = (
            links.concat(
                committee_records
                .map((contribution, index, array) => {
                    if (!processed_candidates[contribution.CAND_ID]){
                        console.log("CAND_ID: " + contribution.CAND_ID)
                        console.log(contribution)
                        nodes.push({name:contribution.CAND_NM, id: contribution.CAND_ID, value: 1, category: 1})
                        processed_candidates[contribution.CAND_ID] = true
                    }
                    return {source: contribution.CMTE_ID, target: contribution.CAND_ID}
                })
            )
        )
    }

    getCandidateLinks()
    .then(result => processCandidate(result))
    .then(() => getCommitteeLinks(committees, req.params.candID))
    .then(result => processCommittees(result))
    .then(()=>{
        //add the link objects generated above to the graph object as a dict of link objcets
        graph["links"] = dedupe(links);
        // add all the node objects to the graph
        graph["nodes"] = dedupe(nodes);
        //console.log(graph)
        //console.log(processed_candidates)
        res.json(graph);
    })
})

// Establish a persisent connection to the DB, using promises, then start the app
MongoClient.connect(url)
    .then((client) => {
        _db = client.db(dbname);
        console.log("Connection Established to " + url);
        // Only star the express app if the DB connection is established
        app.listen(listenPort, () => {console.log("Governet API listening on port: " + listenPort)});
    })
    .catch((err) => {
        console.log(err);
        throw(err);
    });


/*

Name
Address
Party
Races filed for

count of total contributions recieved by the given candidate
count the total number of committees that have given to the candidate
average contribution
largest contribution
smallest contribution

contributions over time, in a time-series

list of committees that have contributed to this individual

most similar candidates based on contributions from committees (jacard similarity!!)

*/