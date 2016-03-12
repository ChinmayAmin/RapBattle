#!/bin/bash
rm update.zip
zip -r update.zip *
aws lambda update-function-code \
--function-name 'xxxxxxxxxxxx' \
--zip-file fileb://./update.zip
aws lambda update-function-configuration \
--function-name 'xxxxxxxxxxxx' \
--description "$(date) -- $(whoami)"
rm update.zip
