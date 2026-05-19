const URL_PPS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTf1QfkAclUHFpdAYZ87d6UUu71mPGF4VLJ83jfWw01Sazmf95hx9lKBq8SYj3rBnuSOWDLat9Ojht6/pub?gid=1321416036&single=true&output=csv';
let publicPPSData = [];
let map;
let markersGroup;

// Fetch live PPS data
Papa.parse(URL_PPS, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        publicPPSData = results.data.map(d => ({
            name: d.PPS || '',
            district: d.Daerah || '',
            jenis: d.Jenis || '',
            statusLawatan: d.Status_Lawatan_PKD_2026 || d.Status || 'Belum Dilawati',
            statusFungsi: d.Status_Fungsi_Semasa || d.fungsi || 'Tidak Aktif',
            lat: parseFloat(d.Latitude) || null,
            lng: parseFloat(d.Longitude) || null
        })).filter(d => d.name !== '');
        
        console.log("Loaded Public PPS Data:", publicPPSData.length, "facilities");
        
        initDashboard();
    }
});

function initDashboard() {
    // Hide loader, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';

    // Set Last Updated Time
    const now = new Date();
    document.getElementById('lastUpdated').innerText = now.toLocaleString('en-MY', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
    });

    populateFilters();
    updateScorecards();
    initMap();
    renderTable();
}

function updateScorecards() {
    const total = publicPPSData.length;
    const active = publicPPSData.filter(d => d.statusFungsi.toLowerCase() === 'aktif').length;
    const verified = publicPPSData.filter(d => d.statusLawatan === 'Telah Dilawati').length;
    const ppd = publicPPSData.filter(d => d.jenis.toLowerCase().includes('sekolah')).length;

    document.getElementById('score-total').innerText = total;
    document.getElementById('score-active').innerText = active;
    document.getElementById('score-verified').innerText = verified;
    document.getElementById('score-ppd').innerText = ppd;
}

function initMap() {
    // Default center for Kedah
    map = L.map('map').setView([6.1184, 100.3685], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
    }).addTo(map);
    markersGroup = L.layerGroup().addTo(map);
}

function populateFilters() {
    const districtFilter = document.getElementById('districtFilter');
    const districts = [...new Set(publicPPSData.map(d => d.district))].filter(Boolean).sort();
    
    districts.forEach(dist => {
        const option = document.createElement('option');
        option.value = dist;
        option.text = dist;
        districtFilter.appendChild(option);
    });
}

function renderTable() {
    const tbody = document.getElementById('ppsTableBody');
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const distFilter = document.getElementById('districtFilter').value;
    const statFilter = document.getElementById('statusFilter').value;

    tbody.innerHTML = '';

    const filteredData = publicPPSData.filter(pps => {
        const matchesSearch = pps.name.toLowerCase().includes(searchInput);
        const matchesDist = distFilter === 'All' || pps.district === distFilter;
        const matchesStat = statFilter === 'All' || pps.statusFungsi.toLowerCase() === statFilter.toLowerCase();
        
        return matchesSearch && matchesDist && matchesStat;
    });

    if (markersGroup) {
        markersGroup.clearLayers();
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 3rem; color: var(--text-muted);">Tiada PPS dijumpai untuk carian ini.</td></tr>';
        return;
    }

    filteredData.forEach(pps => {
        const tr = document.createElement('tr');
        
        // Operational Badge
        let opBadge = '';
        if (pps.statusFungsi.toLowerCase() === 'aktif') {
            opBadge = `<span class="badge badge-active">🟢 AKTIF</span>`;
        } else {
            opBadge = `<span class="badge badge-inactive">🔴 TUTUP / TIDAK AKTIF</span>`;
        }

        // Verification Badge
        let verBadge = '';
        if (pps.statusLawatan === 'Telah Dilawati') {
            verBadge = `<span class="badge badge-verified">✔️ DISEMAK</span>`;
        } else {
            verBadge = `<span class="badge badge-pending">⏳ BELUM DISEMAK</span>`;
        }

        const coords = (pps.lat && pps.lng) ? `<a href="https://www.google.com/maps/search/?api=1&query=${pps.lat},${pps.lng}" class="map-btn" target="_blank">🗺️ Buka Peta</a>` : '<span style="color: var(--text-muted); font-size: 0.85rem;">Koordinat Tiada</span>';

        tr.innerHTML = `
            <td>
                <div class="facility-name">${pps.name}</div>
                <div class="district-name">📍 Daerah: ${pps.district}</div>
            </td>
            <td>${opBadge}</td>
            <td>${verBadge}</td>
            <td>${coords}</td>
        `;
        tbody.appendChild(tr);

        // Add to Map
        if (pps.lat && pps.lng) {
            const markerColor = pps.statusFungsi.toLowerCase() === 'aktif' ? '#10b981' : '#ef4444';
            const marker = L.circleMarker([pps.lat, pps.lng], {
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.8,
                radius: 8,
                weight: 2
            });
            
            const popupContent = `
                <div style="font-family: 'Inter', sans-serif;">
                    <h4 style="margin: 0 0 5px 0; color: var(--primary);">${pps.name}</h4>
                    <p style="margin: 0; font-size: 0.85rem;"><strong>Daerah:</strong> ${pps.district}</p>
                    <p style="margin: 0; font-size: 0.85rem;"><strong>Jenis:</strong> ${pps.jenis}</p>
                    <p style="margin: 0; font-size: 0.85rem;"><strong>Status:</strong> ${pps.statusFungsi}</p>
                </div>
            `;
            marker.bindPopup(popupContent);
            markersGroup.addLayer(marker);
        }
    });

    // Fit map bounds to markers if any exist
    if (markersGroup && markersGroup.getLayers().length > 0) {
        const group = new L.featureGroup(markersGroup.getLayers());
        map.fitBounds(group.getBounds(), { padding: [30, 30] });
    }
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', renderTable);
document.getElementById('districtFilter').addEventListener('change', renderTable);
document.getElementById('statusFilter').addEventListener('change', renderTable);
