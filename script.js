(function () {

    function createDateTime(date) {

        function addPrefixZero(number) {
            return number < 10 ? "0" + number : number;
        }

        return date.getFullYear() + "-" + addPrefixZero(date.getMonth() + 1) + "-" +  addPrefixZero(date.getDate()) + " 00:00:00Z";
    }

    function processData(data) {

        function appendResult() {
            return currentDate + "," + cars + "," + heavyVehicles + "," + bikes + "," + pedestians + "," + night + "\n";
        }

        let result = "";
        let currentDate = "";
        let cars, heavyVehicles, bikes, pedestians, night;
        data.report.forEach(function (element) {
            if (currentDate !== element.date.substring(0, 10)) {
                // New day. Add totals to CSV and reset counters.
                if (result === "") {
                    // Initial iteration. Add header.
                    result = "Date,Cars,Heavy vehicles,Bikes,Pedestians,Night\n";
                } else {
                    result += appendResult();
                }
                currentDate = element.date.substring(0, 10);
                cars = 0;
                heavyVehicles = 0;
                bikes = 0;
                pedestians = 0;
                night = 0;
                console.log("Processing day " + currentDate);
            }
            cars += element.car;
            heavyVehicles += element.heavy;
            bikes += element.bike;
            pedestians += element.pedestrian;
            night += element.night;
        });
        result += appendResult();
        document.getElementById("idExport").value = result;
    }

    function retrieveData() {
        // A proce must be used, to prevent CORS errors
        // Locel use "http://localhost/telraam-proxy/index.php"
        const url = "https://elektrischdeelrijden.nl/wp-content/include-me/telraam-proxy/index.php";  // This is proxying https://telraam-api.net/v1/reports/traffic
        const dateEnd = new Date();
        // Extract three months
        const dateStart = new Date(dateEnd.getFullYear(), dateEnd.getMonth() - 3, dateEnd.getDate());
        const body = {
            "level": "segments",
            "id": document.getElementById("idLocationId").value,
            "format": "per-hour",  // Seems to be only option
            "time_start": createDateTime(dateStart),
            "time_end": createDateTime(dateEnd)
        };
        console.log(JSON.stringify(body, null, 4));
        fetch(
            url + "?path=v1/reports/traffic",
            {
                "method": "POST",
                "headers": {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Api-Key": document.getElementById("idApiKey").value
                },
                "body": JSON.stringify(body)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(processData);
            } else {
                console.error(response);
            }
        }).catch(function (error) {
            console.error(error);
        });
    }

    function initialize() {
        document.getElementById("idSubmit").addEventListener("click", retrieveData);
    }

    initialize();

}());