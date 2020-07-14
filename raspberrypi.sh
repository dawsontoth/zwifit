#!/bin/bash

cd `dirname $0`
sudo -u pi SHUTDOWN_ONDISCONNECT=1 npm start

code=$?
if [ "$code" = "99" ]; then
  /sbin/poweroff
else
  echo "ReturnCode: $code"
fi

