
const districtBox = document.getElementById("districts");
const search = document.getElementById("search");
const update = document.getElementById("update");
const refresh = document.getElementById("refresh");

let districts = [];

async function getData(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Request failed: " + response.status);
    }

    return await response.json();
}

async function loadTemperature() {
    refresh.disabled = true;
    refresh.textContent = "Updating...";
    update.textContent = "Loading temperatures...";

    try {
        const places = await getData(
            "https://raw.githubusercontent.com/open-admin-data/nepal-administrative-divisions/main/data/all-district.json"
        );

        districts = [];

        for (let i = 0; i < places.length; i += 10) {
            const batch = places.slice(i, i + 10);

            const lat = batch.map(d => Number(d.geo.lat));
            const lon = batch.map(d => Number(d.geo.lon));

            const url =
                "https://api.open-meteo.com/v1/forecast?latitude=" +
                lat.join(",") +
                "&longitude=" +
                lon.join(",") +
                "&current=temperature_2m" +
                "&timezone=Asia%2FKathmandu";

            let data = await getData(url);

            if (!Array.isArray(data)) {
                data = [data];
            }

            batch.forEach((place, index) => {
                const weather = data[index];

                if (weather?.current?.temperature_2m == null) {
                    console.log("Missing weather:", place.name.en);
                    return;
                }

                districts.push({
                    name: place.name.en,
                    temperature: weather.current.temperature_2m,
                    time: weather.current.time,
                    latitude: weather.latitude,
                    longitude: weather.longitude
                });
            });
        }

        districts.sort(
            (a, b) => b.temperature - a.temperature
        );

        // Debug: inspect temperatures, coordinates and timestamps
        console.table(districts);

        showDistricts();

        update.textContent =
            "Updated weather for " + districts.length + " districts.";

    } catch (error) {
        console.error("Temperature error:", error);

        update.textContent =
            "Weather could not load. Please try again.";

    } finally {
        refresh.disabled = false;
        refresh.textContent = "Update ↻";
    }
}

function showDistricts() {
    districtBox.innerHTML = "";

    const word = search.value.toLowerCase().trim();

    const found = districts.filter(d =>
        d.name.toLowerCase().includes(word)
    );

    found.forEach(d => {
        const card = document.createElement("div");
        card.className = "district";

        const name = document.createElement("div");
        name.className = "districtname";
        name.textContent =
            "#" + (districts.indexOf(d) + 1) + " · " + d.name;

        const temperature = document.createElement("div");
        temperature.className = "temperature";
        temperature.textContent =
            d.temperature.toFixed(1) + "°C";

        const row = document.createElement("div");
        row.className = "districtop";

        row.appendChild(name);
        row.appendChild(temperature);
        card.appendChild(row);
        districtBox.appendChild(card);
    });

    if (found.length === 0) {
        districtBox.textContent = districts.length === 0
            ? "Waiting for weather data..."
            : "This district doesnot exist, please check your spelling";
    }
}

search.addEventListener("input", showDistricts);
refresh.addEventListener("click", loadTemperature);

loadTemperature();
