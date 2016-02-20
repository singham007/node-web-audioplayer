# CommandLine MP3 Player with WebInterface for remote control

* Clone this repository
```
git clone https://github.com/spaceguy101/node-web-audioplayer.git
```
* Change Directory to repository 
```
cd node-web-audioplayer
```
* Open config.json and Enter your Directory where your media is stored .
```
{
	"MusicDirectory":["/path/media/foo","/path/media/bar"]
}
```
* Run by -
```
node player.js
```
* Once the server has started,You can access the Web Interface at port `8080`
```
http://[hostIpAddress]:8080
