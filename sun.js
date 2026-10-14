
const districtBox = document.getElementById("districts");
const search = document.getElementById("search");
const update = document.getElementById("update");
const refresh = document.getElementById("refresh");

let districts = [];

async function getData(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(url, {
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error("Request failed: " + response.status);
        }

        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

async function loadTemperature() {
    refresh.disabled = true;
    refresh.textContent = "Updating...";
    update.textContent = "Loading district names...";

    try {
        const places = await getData(
            "https://raw.githubusercontent.com/open-admin-data/nepal-administrative-divisions/main/data/all-district.json"
        );

        update.textContent = "Getting temperatures...";

        const lat = places.map(d => Number(d.geo.lat));
        const lon = places.map(d => Number(d.geo.lon));

        const url = "https://api.open-meteo.com/v1/forecast?latitude="
            + lat.join(",")
            + "&longitude=" + lon.join(",")
            + "&current=temperature_2m"
            + "&timezone=Asia%2FKathmandu";

        let data = await getData(url);

        if (!Array.isArray(data)) {
            data = [data];
        }

        districts = places.map((d, i) => ({
            name: d.name.en,
            temperature: data[i]?.current?.temperature_2m
        })).filter(d => d.temperature !== undefined);

        districts.sort((a, b) => b.temperature - a.temperature);

        showDistricts();

        update.textContent = "Do you wanna update?";

    } catch (error) {
        console.log(error);

        update.textContent = error.name === "AbortError"
            ? "Request timed out. Check your internet."
            : "Temperature data could not load. Try again.";

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

        card.innerHTML = `
            <div class="districtop">
                <div class="districtname">
                    #${districts.indexOf(d) + 1} · ${d.name}
                </div>
                <div class="temperature">
                    ${d.temperature}°C
                </div>
            </div>
        `;

        districtBox.appendChild(card);
    });

    if (found.length === 0) {
        districtBox.textContent = districts.length === 0
            ? "Waiting for weather data..."
            : "District not found. Check your spelling.";
    }
}

search.addEventListener("input", showDistricts);
refresh.addEventListener("click", loadTemperature);

loadTemperature();
