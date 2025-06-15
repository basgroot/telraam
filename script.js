(function () {

    const exportElm = document.getElementById("idExport");

    function createDateTime(date) {

        function addPrefixZero(number) {
            return number < 10 ? "0" + number : number;
        }

        return date.getFullYear() + "-" + addPrefixZero(date.getMonth() + 1) + "-" +  addPrefixZero(date.getDate()) + " 00:00:00Z";
    }

    function processData(data) {

        function formatNumber(number) {
            return number.toLocaleString(document.getElementById("idDecimalLocale").value);
        }

        function appendResult() {
            return "\"" + currentDate + "\";" + formatNumber(cars) + ";" + formatNumber(heavyVehicles) + ";" + formatNumber(bikes) + ";" + formatNumber(pedestians) + ";" + formatNumber(night) + ";" +
                formatNumber(carsCorrected) + ";" + formatNumber(heavyVehiclesCorrected) + ";" + formatNumber(bikesCorrected) + ";" + formatNumber(pedestiansCorrected) + ";" + formatNumber(nightCorrected) + ";" + count + "\n";
        }

        function adjustForDowntime(count, uptime) {
            return count / uptime;
        }

        let result = "";
        let currentDate = "";
        let cars, heavyVehicles, bikes, pedestians, night;
        let carsCorrected, heavyVehiclesCorrected, bikesCorrected, pedestiansCorrected, nightCorrected;
        let count;
        if (data.hasOwnProperty("errorMessage")) {
            exportElm.value = "Error: " + data.errorMessage;
            if (data.hasOwnProperty("stackTrace")) {
                // Reported as security issue
                exportElm.value += "\n" + data.stackTrace;
            }
            return;
        }
        if (data.report === undefined || data.report.length === 0) {
            exportElm.value = "No data found.";
            return;
        }
        data.report.forEach(function (element) {
            if (currentDate !== element.date.substring(0, 10)) {
                // New day. Add totals to CSV and reset counters.
                if (result === "") {
                    // Initial iteration. Add header.
                    result = "\"Date\";\"Cars\";\"Heavy vehicles\";\"Bikes\";\"Pedestrians\";\"Night\";\"Cars corrected\";\"Heavy vehicles corrected\";\"Bikes corrected\";\"Pedestrians corrected\";\"Night corrected\";\"Hours\"\n";
                } else {
                    result += appendResult();
                }
                currentDate = element.date.substring(0, 10);
                cars = 0;
                heavyVehicles = 0;
                bikes = 0;
                pedestians = 0;
                night = 0;
                carsCorrected = 0;
                heavyVehiclesCorrected = 0;
                bikesCorrected = 0;
                pedestiansCorrected = 0;
                nightCorrected = 0;
                count = 0;
                console.log("Processing day " + currentDate);
            }
            if (element.uptime < 0.7 && element.night == 0) {
                console.log("Low uptime " + JSON.stringify(element, null, 4));
            }
            cars += element.car;
            heavyVehicles += element.heavy;
            bikes += element.bike;
            pedestians += element.pedestrian;
            night += element.night;
            carsCorrected += adjustForDowntime(element.car, element.uptime);
            heavyVehiclesCorrected += adjustForDowntime(element.heavy, element.uptime);
            bikesCorrected += adjustForDowntime(element.bike, element.uptime);
            pedestiansCorrected += adjustForDowntime(element.pedestrian, element.uptime);
            nightCorrected += adjustForDowntime(element.night, element.uptime);
            count += 1;
        });
        result += appendResult();
        exportElm.value = result;
    }

    function retrieveData() {
        // A proce must be used, to prevent CORS errors
        // Locel use "http://localhost/telraam-proxy/index.php"
        const url = "https://elektrischdeelrijden.nl/wp-content/include-me/telraam-proxy/index.php";  // This is proxying https://telraam-api.net/v1/reports/traffic
        const dateEnd = new Date(document.getElementById("idDateEnd").value);
        const dateStart = new Date(document.getElementById("idDateStart").value);
        const body = {
            "level": "segments",
            "id": document.getElementById("idLocationId").value,
            "format": "per-hour",  // Seems to be only option
            "time_start": createDateTime(dateStart),
            "time_end": createDateTime(dateEnd)
        };
        const apiKey = document.getElementById("idApiKey").value.trim();
        if (apiKey === "") {
            exportElm.value = "Error: API key required.";
            return;
        }
        exportElm.value = "Requesting " + JSON.stringify(body, null, 4);
        fetch(
            url + "?path=v1/reports/traffic",
            {
                "method": "POST",
                "headers": {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Api-Key": apiKey
                },
                "body": JSON.stringify(body)
            }
        ).then(function (response) {
            if (response.ok) {
                response.json().then(processData);
            } else {
                console.error(response);
                if (response.status >= 400 && response.status < 500) {
                    response.json().then(function (responseJson) {
                        exportElm.value = "Error " + response.status + ": " + JSON.stringify(responseJson, null, 4);
                    });
                } else {
                    exportElm.value = "Error: " + response.status + " " + response.statusText;
                }
            }
        }).catch(function (error) {
            console.error(error);
            exportElm.value = "Error: " + error;
        });
    }

    function initialize() {
        document.getElementById("idSubmit").addEventListener("click", retrieveData);
        const dateEnd = new Date();
        dateEnd.setDate(dateEnd.getDate() + 1);  // Range is not including this day
        // Extract three months
        const dateStart = new Date(dateEnd.getFullYear(), dateEnd.getMonth() - 3, dateEnd.getDate());
        dateStart.setDate(dateStart.getDate() + 1);
        document.getElementById("idDateStart").value = dateStart.toISOString().substring(0, 10);
        document.getElementById("idDateEnd").value = dateEnd.toISOString().substring(0, 10);
    }

    initialize();

}());