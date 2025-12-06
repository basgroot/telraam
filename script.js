(function () {

    const exportElm = document.getElementById("idExport");

    function addPrefixZero(number) {
        return number < 10 ? "0" + number : number;
    }

    function createDateString(date) {
        return date.getFullYear() + "-" + addPrefixZero(date.getMonth() + 1) + "-" +  addPrefixZero(date.getDate());
    }

    function formatNumber(number) {
        return number.toLocaleString(document.getElementById("idDecimalLocale").value);
    }

    function processData(responseJson) {

        function hasProperty(obj, propertyName) {
            if (Object.hasOwn(obj, propertyName)) {
                return true;
            }
            exportElm.value = "No '" + propertyName + "' data found.";
            return false;
        }

        if (Object.hasOwn(responseJson, "errorMessage")) {
            exportElm.value = "Error: " + responseJson.errorMessage;
            if (Object.hasOwn(responseJson, "stackTrace")) {
                // Reported as security issue
                exportElm.value += "\n" + responseJson.stackTrace;
            }
            return;
        }
        if (!Object.hasOwn(responseJson, "data") || !Object.hasOwn(responseJson, "dates")) {
            exportElm.value = "Error: Unexpected data received: " + JSON.stringify(responseJson, null, 4);
            return;
        }
        if (!hasProperty(responseJson.data, "bike") ||
            !hasProperty(responseJson.data, "car") ||
            !hasProperty(responseJson.data, "heavy") ||
            !hasProperty(responseJson.data, "pedestrian") ||
            !hasProperty(responseJson.data, "night")) {
            return;
        }

        let result = "\"Date\";\"Cars\";\"Heavy vehicles\";\"Bikes\";\"Pedestrians\";\"Night\"\n";
        responseJson.dates.forEach(function (element, i) {
            const currentDate = element;
            const bikes = responseJson.data.bike[i];
            const cars = responseJson.data.car[i];
            const heavyVehicles = responseJson.data.heavy[i];
            const pedestrians = responseJson.data.pedestrian[i];
            const night = responseJson.data.night[i];
            result += "\"" + currentDate + "\";" + formatNumber(cars) + ";" + formatNumber(heavyVehicles) + ";" + formatNumber(bikes) + ";" + formatNumber(pedestrians) + ";" + formatNumber(night) + "\n";
        });

        exportElm.value = result;
    }

    function retrieveData() {
        // A proxy must be used, to prevent CORS errors
        // Local use const url = "http://localhost/telraam-proxy/index.php";
        // Remote use const url = "https://elektrischdeelrijden.nl/wp-content/include-me/telraam-proxy/index.php";
        const dateStart = new Date(document.getElementById("idDateStart").value);
        const dateEnd = new Date(document.getElementById("idDateEnd").value);
        const url = "https://elektrischdeelrijden.nl/wp-content/include-me/telraam-proxy/index.php" +
            "?id=" + encodeURIComponent(document.getElementById("idLocationId").value) +
            "&dateStart=" + encodeURIComponent(createDateString(dateStart)) +
            "&dateEnd=" + encodeURIComponent(createDateString(dateEnd));
        // Sample: https://telraam.net/api/measurements-day-barchart/segments/9000007626/2025-09-02/2025-09-16
        exportElm.value = "Requesting " + url + " ...";
        fetch(
            url, {
                "method": "GET",
                "headers": {
                    "Accept": "application/json"
                }
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