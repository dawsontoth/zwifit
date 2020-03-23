#!/bin/bash

cd `dirname $0`
sudo -u pi SHUTDOWN_ONDISCONNECT=1 npm start

code=$?
if [ "$code" = "1" ]; then
  /sbin/poweroff
else
  echo "ReturnCode: $code"
fi

