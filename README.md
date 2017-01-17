# CLHACK

## Setup

You must use the same developer account that the Alexa is logged into. Ask Alexa "Who am I?" to hear the account name. Currently the office Alexa is logged into cl+it@connectedlab.com

Login to Alexa to see its latest interactions:

http://alexa.amazon.com/spa/index.html

Use the Developer profile to edit skills (same account as Alexa is logged into):

https://developer.amazon.com/edw/home.html#/skills/list

The Amazon web service that the skills are pointing to are under josh.allen.it@gmail.com

https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions?display=list

## Skills

`Alexa open Rap King`

`Alexa open Haiku Battle`

## Testing

test with

```
node testRouter.js {event json} {context json}
```

sample event json
```
{  
   version:'1.0',
   session:{  
      new:false,
      sessionId:'SessionId.bd6961c1-c302-4d18-a765-c3f91f4a1f89',
      application:{  
         applicationId:'amzn1.echo-sdk-ams.app.a0e4eedf-19c7-422b-9558-99aab6f9b838'
      },
      attributes:{  
         score:0,
         currentQuestionIndex:0,
         speechOutput:'The topic is. Trump',
         correctAnswerText:'13,000',
         repromptText:'The topic is. Trump',
         questions:[  
            Object
         ],
         rapTopic:'Trump',
         correctAnswerIndex:4
      },
      user:{  
         userId:'amzn1.echo-sdk-account.AGR4RHMH2B2S6NMAK5FHBYEFRSFUWODU5K6MFYOSLH7XMX527GM4U'
      }
   },
   request:{  
      type:'LaunchRequest',
      requestId:'EdwRequestId.e3179797-d84b-4160-a1e7-b1ee1f178266',
      timestamp:'2016-03-12T15:28:16Z'
   }
}
```

context json (do not need to care)

```
{  
   awsRequestId:'0af1c365-e867-11e5-ba91-5f49ff47c7d2',
   invokeid:'0af1c365-e867-11e5-ba91-5f49ff47c7d2',
   logGroupName:'/aws/lambda/RapBattle',
   logStreamName:'2016/03/12/[$LATEST]183266f8e40b4777912f351f60ce9d84',
   functionName:'RapBattle',
   memoryLimitInMB:'128',
   functionVersion:'$LATEST',
   invokedFunctionArn:'arn:aws:lambda:us-east-1:805109747252:function:RapBattle',
   getRemainingTimeInMillis:[  
      Function
   ],
   succeed:[  
      Function
   ],
   fail:[  
      Function
   ],
   done:[  
      Function
   ]
}
```
