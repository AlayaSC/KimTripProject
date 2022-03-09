export let AppConfig = {
	serverConfig: {
		dbURL: 'http://ec2-52-77-211-125.ap-southeast-1.compute.amazonaws.com:5984',
		userDBName: 'usersdb',
		diaryDBName: 'kimberlydb',
		auth: {
			username: "kimtripAdmin",
        	password: "please"
		}
	},
	mapConfig: {
		//defaultCoords: [-31.9812, 115.8199], // uwa, perth
		//defaultCoords: [-18.1945972,125.5662314], // fitzroy
		defaultCoords: [-18.4890009,125.0265751], // broome
		minZoom: 6, // min is 6
		maxZoom: 12, // min is 12
	},
	socialSharingConfig: {
		googleZoom: 7
	},
};