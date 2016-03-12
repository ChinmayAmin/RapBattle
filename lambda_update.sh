#!/bin/bash
rm update.zip
zip -r update.zip *
aws lambda update-function-code \
--function-name RapBattle \
--zip-file fileb://./update.zip
aws lambda update-function-configuration \
--function-name RapBattle \
--description "$(date) -- $(whoami)"
rm update.zip
