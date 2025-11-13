#!/bin/bash
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
# Installing all of the requirements
pip install -r requirements.txt
# Running the actuall application in the v env
python app.py
