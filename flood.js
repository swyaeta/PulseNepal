const districtBox = document.getElementById("districts");
const search = document.getElementById("search");
const update = document.getElementById("update");
const refresh = document.getElementById("refresh");

const API = "https://bipadportal.gov.np/api/v1/";

let reports = [];

function makeDiv(className, text) {
    let div = document.createElement("div");
    div.className = className;
    div.textContent = text;
    return div;
}

function getCount(item, camel, snake) {
    let loss = typeof item.loss === "object" && item.loss ? item.loss : {};
    return loss[camel] || loss[snake] || item[camel] || item[snake] || 0;
}

function getPlace(item) {
    let place = { district: "", municipality: "" };
    let wards = item.wards || [];
    let ward = wards[0];

    if (ward && typeof ward === "object" && ward.municipality && typeof ward.municipality === "object") {
        place.municipality = ward.municipality.title || "";

        if (ward.municipality.district && typeof ward.municipality.district === "object") {
            place.district = ward.municipality.district.title || "";
        }
    }

    return place;
}

async function getFloodIds() {
    let response = await fetch(API + "hazard/?limit=200");

    if (!response.ok) {
        throw new Error("Hazard list error " + response.status);
    }

    let data = await response.json();
    let ids = [];

    data.results.forEach(h => {
        if (h.title && h.title.toLowerCase().includes("flood")) {
            ids.push(h.id);
        }
    });

    if (ids.length === 0) {
        throw new Error("No flood hazard type found");
    }

    return ids;
}

async function loadReports() {
    try {
        update.textContent = "Loading flood reports...";

        let ids = await getFloodIds();

        let sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        let url = API + "incident/?hazard=" + ids.join(",")
            + "&incident_on__gt=" + sixMonthsAgo.toISOString().slice(0, 10)
            + "&ordering=-incident_on"
            + "&expand=loss,wards.municipality.district"
            + "&limit=1000";

        let response = await fetch(url);

        if (!response.ok) {
            throw new Error("Incident error " + response.status);
        }

        let data = await response.json();

        console.log(data.results[0]);

        reports = data.results.map(item => {
            let place = getPlace(item);

            return {
                title: item.title || "Flood report",
                district: place.district,
                municipality: place.municipality,
                date: new Date(item.incidentOn || item.incident_on),
                deaths: getCount(item, "peopleDeathCount", "people_death_count"),
                missing: getCount(item, "peopleMissingCount", "people_missing_count"),
                injured: getCount(item, "peopleInjuredCount", "people_injured_count"),
                houses: getCount(item, "infrastructureDestroyedHouseCount", "infrastructure_destroyed_house_count")
            };
        });

        reports = reports.filter(r => !isNaN(r.date) && r.date >= sixMonthsAgo);

        reports.sort((a, b) => b.date - a.date);

        showReports();

        update.textContent = "Do you wanna update?";

    } catch (error) {
        update.textContent = "Flood reports could not load.";
        console.log(error);
    }
}

function makeStat(label, value, extraClass) {
    let row = document.createElement("div");
    row.className = "stat";

    let name = document.createElement("span");
    name.className = "statlabel";
    name.textContent = label;

    let number = document.createElement("span");
    number.className = "statvalue " + extraClass;
    number.textContent = value;

    row.appendChild(name);
    row.appendChild(number);

    return row;
}

function showReports() {
    districtBox.innerHTML = "";

    let word = search.value.toLowerCase();

    let found = reports.filter(r =>
        (r.district + " " + r.municipality + " " + r.title).toLowerCase().includes(word)
    );

    districtBox.appendChild(makeDiv("weather", found.length + " flood reports in the past 6 months"));

    found.forEach(r => {
        let card = document.createElement("div");
        card.className = "district";

        let heading = r.district || r.municipality || r.title;

        let place = "";
        if (r.district && r.municipality) {
            place = r.municipality;
        }

        let date = r.date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });

        let top = document.createElement("div");
        top.className = "districttop";
        top.appendChild(makeDiv("districtname", heading));
        top.appendChild(makeDiv("reportdate", date));
        card.appendChild(top);

        if (place !== "") {
            card.appendChild(makeDiv("place", "Place of flood: " + place));
        }

        let stats = document.createElement("div");
        stats.className = "stats";
        stats.appendChild(makeStat("Total deaths", r.deaths, "deaths"));
        stats.appendChild(makeStat("Total injured", r.injured, "injured"));
        stats.appendChild(makeStat("Houses destroyed", r.houses, "houses"));
        card.appendChild(stats);

        districtBox.appendChild(card);
    });

    if (found.length === 0) {
        districtBox.textContent = "No flood reports found. Check your spelling.";
    }
}

search.addEventListener("input", showReports);
refresh.addEventListener("click", loadReports);

loadReports();
setInterval(loadReports, 30 * 60 * 1000);