#!/bin/bash
rm update.zip
zip -r update.zip *
aws lambda update-function-code \
--function-name MyTriviaGame \
--zip-file fileb://./update.zip
aws lambda update-function-configuration \
--function-name MyTriviaGame \
--description "$(date) -- $(whoami)"
rm update.zip
