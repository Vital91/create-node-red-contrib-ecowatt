const { exit } = require('process');

module.exports = function(RED) {
    
  function    GetEcowatt(config) {
      RED.nodes.createNode(this,config);
      this.ostr=config.ostr;
      this.sandbox = config.sandbox;
      
      var node = this;
      const https = require('https');

      node.on('input',  function(msg) {              
          var options = {
              hostname: "digital.iservices.rte-france.com",
              port: 443,
              path: "/token/oauth/",
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + this.ostr
              }
            };
          var req = https.request(options, function (resp) {          
              var body = '';      
              resp.on('data', function (chunk) {
                body = body + chunk;
              });           
              resp.on('end',function(){
                  if (resp.statusCode!=200) {
                    msg.payload="Error getting token, check Oauth STR configuration";
                    node.status({fill:"red",shape:"ring",text:"Error getting token"});
                    node.send(msg); 
                    return;
                  }
                  var token=JSON.parse(body).access_token;
                  if ( !token ) { 
                    msg.payload = body;
                    node.send(msg); 
                    return;
                  }
                  var body2 = '';                 
                  var options2 = {
                      hostname: "digital.iservices.rte-france.com",
                      port: 443,
                      path: '/open_api/ecowatt/v5/'+((config.sandbox==true)?('sandbox/'):(''))+'signals',
                      method: 'GET',
                      headers: { 'Authorization':'Bearer ' + token }
                  };             
    
                  var req2 = https.request(options2, function (resp) {
                      resp.on('data', function (chunk) {
                          body2 = body2 + chunk;
                        });
                      resp.on('end',function(){
                          if (body2!='') {
                              var r_obj = JSON.parse(body2);
                              node.status({fill:"green",shape:"dot",text:r_obj.signals[0].message});
                              msg.payload = r_obj;
                              node.send(msg);                          
                          }
                          else {
                            msg.payload="Error API Call blocked for "+resp.rawHeaders[11]+" seconds";
                            node.status({fill:"red",shape:"ring",text:"API call delayed "+resp.rawHeaders[11]+'s'});
                            node.send(msg);
                          }
                      }); 
                      resp.on('error', function (e) {
                        console.log("[get-ecowatt] Error : " + e.message);
                      });
                  });
                  req2.end();
              });           
            });         
            req.on('error', function (e) {
              console.log("[get-ecowatt] Error : " + e.message);
            });

           req.end();
      });
  }

  RED.nodes.registerType("ecowatt",GetEcowatt);
}

