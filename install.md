# Dependencies
# google-chrome https://github.com/nodesource/distributions/blob/master/README.md#debinstall
sudo apt install git curl npm
# Using Ubuntu
curl -fsSL https://deb.nodesource.com/setup_15.x | sudo -E bash -
sudo apt-get install -y nodejs
# Get the repositories
git clone https://github.com/hugolpz/Dragons_Bot.git
git clone https://github.com/lingua-libre/unilex-extended.git
# Get to the script
cd ./Dragons_Bot                            # move to directory
npm install                                 # install dependencies
node create-Lingualibre-lists-unilex.js     # run the script
