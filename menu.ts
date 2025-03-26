export function setupMenuHandlers(Options: {
    wind: Float32Array;
    dynamicWind: boolean;
}) {
    const windxInp = document.getElementById('windX');
    const windYInp = document.getElementById('windY');
    const windxZInp = document.getElementById('windZ');
    const toggleWindButton = document.getElementById('toggleDynamicWind');

    const windXVal = document.getElementById('windXVal');
    const windYVal = document.getElementById('windYVal');
    const windZVal = document.getElementById('windZVal');

    if (windxInp && windXVal) {
        windxInp.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            const val = parseFloat(input.value);
            windXVal.textContent = val.toString();
            Options.wind[0] = val;
            
        });
    }

    if (windYInp && windYVal) {
        windYInp.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            const val = parseFloat(input.value);
            windYVal.textContent = val.toString();
            Options.wind[1] = val;
 
        });
    }

    if (windxZInp && windZVal) {
        windxZInp.addEventListener('input', (e) => {
            const input = e.target as HTMLInputElement;
            const val = parseFloat(input.value);
            windZVal.textContent = val.toString();
            Options.wind[2] = val;

        });
    }

    if (toggleWindButton) {
        toggleWindButton.addEventListener('click', () => {
            Options.dynamicWind = !Options.dynamicWind;
            
        });
    }
}
