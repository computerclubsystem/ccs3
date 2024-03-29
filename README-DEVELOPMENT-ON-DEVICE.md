Use "Raspberry Pi Imager" to create Raspberry Pi 64 bit OS with Desktop installation on USB or SD card and plug it in the Raspberry to boot - configure settings and set the username to "pi" - if necessary, configure WiFi too and also allow SSH access

Configure C# with VSCode dev environment for Raspberry Pi 5:
- Log in with SSH to Raspberry Pi:
ssh pi@192.168.1.4
- Navigate to the home directory:
cd ~
- Download dotnet 8 - instructions in  https://learn.microsoft.com/en-us/dotnet/core/install/linux-scripted-manual#manual-install :
wget https://download.visualstudio.microsoft.com/download/pr/3bebb4ec-8bb7-4854-b0a2-064bf50805eb/38e6972473f83f11963245ffd940b396/dotnet-sdk-8.0.201-linux-arm64.tar.gz
- Create directory where the file will be extracted
mkdir .dotnet
- Extract the file to the directory
tar zxf dotnet-sdk-8.0.201-linux-arm64.tar.gz -C .dotnet
- Open .bashrc to add the folder to it at the end:
nano .bashrc
- Go to the end of the file and add these two lines:
export DOTNET_ROOT=~/.dotnet
export PATH=~/.dotnet:$PATH
- Press CTRL+S to save and CTRL+X to exit
- Restart the Raspberry Pi:
sudo reboot
- After the Raspberry Pi restarts, log in with ssh and verify dotnet is accessible from the terminal:
dotnet --info
- The above command should show dotnet information
- Create folder for dev files:
mkdir dev
- Navigate to the folder:
cd dev
- Clone the repository
git clone https://github.com/computerclubsystem/device-timer.git
- Start VS Code on your development machine (no need to have it installed in Raspberry Pi)
- Install extension "Remote SSH" ( ID ms-vscode-remote.remote-ssh )
- Not sure if this is necessary for remote development: Install extension "C# Dev Kit" ( ID ms-dotnettools.csdevkit )
- Click on the remote connection button in the lower-left corner of VS Code and select "Connect current window to host..."
- Select the IP address of the Raspberry Pi
- VS Code will ask for the password for pi@192.168.1.4 - provide it
- Select File -> Open folder ... and select /home/pi/dev/device-timer/
- VS Code will ask for the password again - provide it
- VS Code will ask to install "C# Dev Kit" (on the Raspberry Pi, locally it is already installed) - Click on "Insytall" (or click on "Show Recommendations" and select to install its Pre-Release version) - the process could take 5 or even more minutes depending on the speed of the USB / SD card and the speed of internet. During the process you can see error notification like "Microsoft.CodeAnalysis.LanguageServer client: couldn't create connection to server." - this is probably because the install process is downloading large files from internet 
- At some point the VS Code "Output" window will open and will show VS Code is downloading dotnet-runtime. After this process is done - restart VS Code
- After the extensions are installed and VS Code is restarted, some actions might need to be performed before seeing "Solution explorer" at the bottom of VS Code "Explorer (CTRL+SHIFT+E)" - if you don't see the "Solution Explorer" there - Open the folder /home/pi/dev/device-timer , open a terminal and build the solution with "dotnet build", now File - Close folder, restart VS Code, connect again and open the folder /home/pi/dev/device-timer - go to "Explorer" - you should now see the "Solution Explorer".
- Go to VS Code's "Run and Debug" - you will see "DeviceTimerApp" which already has configuration in ".vscode/launch.json" file - set a breakpoint somewhere (for example in App.cs function Start) and click on the "Play" button - verify that debugging works as expected