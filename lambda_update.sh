#!/bin/bash
rm update.zip
zip -r update.zip *
aws lambda update-function-code \
--function-name test \
--zip-file fileb://./update.zip
aws lambda update-function-configuration \
--function-name test \
--description "$(date) -- $(whoami)"
rm update.zip
