
const districtBox = document.getElementById("districts");
const search = document.getElementById("search");
const update = document.getElementById("update");
const refresh = document.getElementById("refresh");

let districts = [];

async function loadWeather() {
    try {
        update.textContent = "Loading weather...";

        // getting district name and all
        let response = await fetch(
            "https://raw.githubusercontent.com/open-admin-data/nepal-administrative-divisions/main/data/all-district.json"
        );

        let places = await response.json();

        // getting the weather from every district
        let lat = places.map(d => Number(d.geo.lat));
        let lon = places.map(d => Number(d.geo.lon));

        let url = "https://api.open-meteo.com/v1/forecast?latitude="
            + lat.join(",")
            + "&longitude=" + lon.join(",")
            + "&current=temperature_2m,precipitation"
            + "&timezone=Asia%2FKathmandu";

        let weather = await fetch(url);
        let data = await weather.json();

        if (!Array.isArray(data)) {
            data = [data];
        }

        // this save the rainfall readings
        districts = places.map((d, i) => ({
            name: d.name.en,
            temperature: data[i].current.temperature_2m,
            rainfall: data[i].current.precipitation
        }));

        // This puts the highest rainfall at the top
        districts.sort((a, b) => b.rainfall - a.rainfall);

        showDistricts();

        update.textContent = "Weather data from Open-Meteo";

    } catch (error) {
        update.textContent = "Weather could not load.";
        console.log(error);
    }
}

function showDistricts() {
    districtBox.innerHTML = "";

    let word = search.value.toLowerCase();

    let found = districts.filter(d =>
        d.name.toLowerCase().includes(word)
    );

    found.forEach(d => {
        let card = document.createElement("div");
        card.className = "district";

        card.innerHTML = `
            <div class="districttop">
                <div>
                    <div class="districtname">
                        #${districts.indexOf(d) + 1} · ${d.name}
                    </div>

                    <div class="weather">
                        Rainfall: ${d.rainfall > 0.1 ? "Yes" : "No"}
                        · ${d.temperature}°C
                    </div>
                </div>

                <div class="rainval">
                    ${d.rainfall} mm
                </div>
            </div>
        `;

        districtBox.appendChild(card);
    });

    if (found.length === 0) {
        districtBox.textContent = "Such district doesnot exist or you typed wrong";
    }
}

search.addEventListener("input", showDistricts);
refresh.addEventListener("click", loadWeather);

loadWeather();
setInterval(loadWeather, 60000);
