(function () {

    const exportElm = document.getElementById("idExport");

    /**
     * Adds a leading zero to a number if it's less than 10.
     * 
     * @param {number} number - The number to format.
     * @returns {string|number} The number with a leading zero if it's less than 10, otherwise the original number.
     * @example
     * addPrefixZero(5);  // returns "05"
     * addPrefixZero(15); // returns 15
     */
    function addPrefixZero(number) {
        return number < 10 ? "0" + number : number;
    }

    /**
     * Converts a Date object to a formatted date string in YYYY-MM-DD format.
     * @param {Date} date - The date object to convert.
     * @returns {string} A date string in the format "YYYY-MM-DD".
     */
    function createDateString(date) {
        return date.getFullYear() + "-" + addPrefixZero(date.getMonth() + 1) + "-" +  addPrefixZero(date.getDate());
    }

    /**
     * Formats a number according to the specified locale from the decimal locale input element.
     * 
     * @param {number} number - The number to be formatted.
     * @returns {string} The formatted number as a locale-specific string.
     */
    function formatNumber(number) {
        return number.toLocaleString(document.getElementById("idDecimalLocale").value);
    }

    /**
     * Processes the response JSON data from Telraam API and converts it into a CSV format.
     * The function validates the response structure, checks for required properties (bike, car, heavy, pedestrian, night),
     * and generates a semicolon-separated CSV string with traffic data.
     * 
     * @param {Object} responseJson - The JSON response object from the Telraam API
     * @param {string} [responseJson.errorMessage] - Optional error message if the request failed
     * @param {string} [responseJson.stackTrace] - Optional stack trace for error debugging
     * @param {Object} responseJson.data - Container object for traffic data arrays
     * @param {Array<number>} responseJson.data.bike - Array of bicycle counts per date
     * @param {Array<number>} responseJson.data.car - Array of car counts per date
     * @param {Array<number>} responseJson.data.heavy - Array of heavy vehicle counts per date
     * @param {Array<number>} responseJson.data.pedestrian - Array of pedestrian counts per date
     * @param {Array<number>} responseJson.data.night - Array of night traffic counts per date
     * @param {Array<string>} responseJson.dates - Array of date strings corresponding to the data arrays
     * @returns {void} The function updates the exportElm.value with either the CSV result or an error message
     */
    function processData(responseJson) {

        /**
         * Checks if an object has a specific property and displays an error message if not found.
         * @param {Object} obj - The object to check for the property.
         * @param {string} propertyName - The name of the property to look for.
         * @returns {boolean} True if the property exists on the object, false otherwise.
         * @sideeffect Sets exportElm.value with an error message when the property is not found.
         */
        function hasProperty(obj, propertyName) {
            if (Object.hasOwn(obj, propertyName)) {
                return true;
            }
            exportElm.value = "No '" + propertyName + "' data found. Possible reasons:\n" +
                "- Selected date range exceeds 3 months.\n" +
                "- The location id is incorrect.\n" +
                "- The Telraam API has changed.";
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
        // Telraam returned a successful but empty result; show the explanatory message if present.
        if (Object.hasOwn(responseJson, "message") &&
            Object.hasOwn(responseJson, "dates") &&
            Array.isArray(responseJson.dates) &&
            responseJson.dates.length === 0) {
            exportElm.value = responseJson.message;
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

    /**
     * Retrieves traffic data from the Telraam API via a proxy server.
     * 
     * @returns {void}
     */
    function retrieveData() {
        // A proxy must be used, to prevent CORS errors
        // Local use const url = "http://localhost/telraam-proxy/index.php";
        // Remote use const url = "https://basement.nl/telraam-proxy/index.php";
        // The date inputs already provide "YYYY-MM-DD"; use the values directly to avoid a
        // UTC off-by-one day that a round-trip through Date would introduce in some timezones.
        const url = "https://basement.nl/telraam-proxy/index.php" +
            "?id=" + encodeURIComponent(document.getElementById("idLocationId").value) +
            "&dateStart=" + encodeURIComponent(document.getElementById("idDateStart").value) +
            "&dateEnd=" + encodeURIComponent(document.getElementById("idDateEnd").value);
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
                response.json().then(processData).catch(function (error) {
                    console.error(error);
                    exportElm.value = "Error parsing JSON response: " + error;
                });
            } else {
                console.error(response);
                if (response.status >= 400 && response.status < 500) {
                    response.json().then(function (responseJson) {
                        exportElm.value = "Error " + response.status + ": " + JSON.stringify(responseJson, null, 4);
                    }).catch(function (error) {
                        console.error(error);
                        exportElm.value = "Error " + response.status + ": " + response.statusText;
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

    /**
     * Initializes the application by setting up event listeners and default date values.
     * Attaches a click event listener to the submit button and sets the date range inputs
     * to a default 3-month period ending tomorrow.
     * 
     * @returns {void}
     */
    function initialize() {
        document.getElementById("idSubmit").addEventListener("click", retrieveData);
        const dateEnd = new Date();
        dateEnd.setDate(dateEnd.getDate() + 1);  // Range is not including this day
        // The Telraam API rejects ranges longer than 91 days and then returns an empty result.
        // A calendar "3 months" can be up to 92 days, so use a fixed 90-day window in days instead.
        const dateStart = new Date(dateEnd);
        dateStart.setDate(dateStart.getDate() - 90);
        // Use createDateString (local date parts) to avoid a UTC off-by-one day from toISOString().
        document.getElementById("idDateStart").value = createDateString(dateStart);
        document.getElementById("idDateEnd").value = createDateString(dateEnd);
    }

    initialize();

}());