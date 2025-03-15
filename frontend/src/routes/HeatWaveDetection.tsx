import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import InteractiveMap from '../components/InteractiveMap';

interface Location {
    lat: number;
    lng: number;
}

interface HeatWaveData {
    temperature: {
        value: number;
        category: string;
        color: string;
        description: string;
    };
    hourly: {
        time: string[];
        temperature: number[];
        humidity: number[];
        dewPoint: number[];
        feelsLike: number[];
        cloudCover: number[];
        pressure: number[];
        cloudCoverLow: number[];
        cloudCoverMid: number[];
        cloudCoverHigh: number[];
        evapotranspiration: number[];
        vaporPressure: number[];
        windSpeed: number[];
        windSpeedHigh: number[];
        windGusts: number[];
        uvIndex: number[];
        solarRadiation: number[];
        groundTemperature: number[];
        heatIndex: number[];
    };
    location: {
        latitude: number;
        longitude: number;
        timezone: string;
        utcOffset: number;
    };
}

// Helper function to format time
const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const HeatWaveDetection = () => {
    const [location, setLocation] = useState<Location | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Get user's location on component mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    setError('Unable to retrieve your location');
                    console.error('Error getting location:', error);
                }
            );
        }
    }, []);

    // Handle location change from map
    const handleLocationChange = (newLocation: Location) => {
        setLocation(newLocation);
    };

    // Fetch heat wave data using React Query
    const { data: heatData, isLoading: heatDataLoading } = useQuery({
        queryKey: ['heat-data', location?.lat, location?.lng],
        queryFn: async () => {
            if (!location) throw new Error('Location not available');
            const response = await axios.get('http://localhost:3000/heat-data', {
                params: {
                    latitude: location.lat,
                    longitude: location.lng
                }
            });
            return response.data as HeatWaveData;
        },
        enabled: !!location,
    });

    return (
        <main className="dashboard-main">
            <div className="navbar-header border-b border-neutral-200 dark:border-neutral-600">
                <div className="flex items-center justify-between">
                    <div className="col-auto">
                        <div className="flex flex-wrap items-center gap-[16px]">
                            <button type="button" className="sidebar-toggle">
                                <Icon icon="heroicons:bars-3-solid" className="icon non-active" />
                                <Icon icon="iconoir:arrow-right" className="icon active" />
                            </button>
                            <button type="button" className="sidebar-mobile-toggle d-flex !leading-[0]">
                                <Icon icon="heroicons:bars-3-solid" className="icon !text-[30px]" />
                            </button>
                            <form className="navbar-search">
                                <input type="text" name="search" placeholder="Search location..." />
                                <Icon icon="ion:location-outline" className="icon" />
                            </form>
                        </div>
                    </div>
                    <div className="col-auto">
                        <div className="flex flex-wrap items-center gap-3">
                            <button type="button" id="theme-toggle" className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 dark:text-white rounded-full flex justify-center items-center">
                                <span id="theme-toggle-dark-icon" className="hidden">
                                    <i className="ri-sun-line" />
                                </span>
                                <span id="theme-toggle-light-icon" className="hidden">
                                    <i className="ri-moon-line" />
                                </span>
                            </button>
                            <button data-dropdown-toggle="dropdownNotification" className="has-indicator w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full flex justify-center items-center" type="button">
                                <Icon icon="mdi:weather-sunny-alert" className="text-neutral-900 dark:text-white text-xl" />
                            </button>
                            <button data-dropdown-toggle="dropdownProfile" className="flex justify-center items-center rounded-full" type="button">
                                <img src="assets/images/user.png" alt="image" className="w-10 h-10 object-fit-cover rounded-full" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-main-body">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                    <h6 className="font-semibold mb-0 dark:text-white">Heat Wave Detection</h6>
                    <ul className="flex items-center gap-[6px]">
                        <li className="font-medium">
                            <a href="#" className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 dark:text-white dark:hover:text-primary-600">
                                <Icon icon="mdi:sun-thermometer" className="icon text-lg" />
                                Heat Wave Monitor
                            </a>
                        </li>
                        <li className="text-neutral-600 dark:text-white">-</li>
                        <li className="text-neutral-600 font-medium dark:text-white">Live Data</li>
                    </ul>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-12 2xl:col-span-9">
                        <InteractiveMap 
                            location={location}
                            onLocationChange={handleLocationChange}
                        />
                    </div>

                    <div className="xl:col-span-12 2xl:col-span-3">
                        <div className="card h-full rounded-lg border-0 hover:shadow-lg transition-shadow duration-300">
                            <div className="card-body p-5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 opacity-5 transform rotate-45">
                                    <Icon icon="mdi:sun-thermometer" className="w-full h-full" />
                                </div>
                                
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <h5 className="font-semibold text-lg text-neutral-900 dark:text-white">Heat Wave Status</h5>
                                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded-full">Live</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div>
                                        <p className="font-medium text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
                                            Temperature
                                            <Icon icon="heroicons:information-circle" className="text-neutral-400 text-lg" />
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <h6 className="text-2xl font-bold mb-0 dark:text-white">
                                                {heatDataLoading ? 'Loading...' : `${heatData?.hourly.temperature[0].toFixed(1)}°C`}
                                            </h6>
                                            <span className={`text-sm font-medium ${
                                                heatData?.temperature.color === 'green' ? 'text-success-600 dark:text-success-400' :
                                                heatData?.temperature.color === 'yellow' ? 'text-warning-600 dark:text-warning-400' :
                                                heatData?.temperature.color === 'red' ? 'text-danger-600 dark:text-danger-400' :
                                                'text-neutral-600 dark:text-neutral-400'
                                            }`}>
                                                {heatDataLoading ? '' : heatData?.temperature.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-y border-neutral-100 dark:border-neutral-700">
                                    <div>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Feels Like</p>
                                        <div className="flex items-center gap-1">
                                            <span className="text-lg font-semibold dark:text-white">
                                                {heatData ? `${heatData.hourly.feelsLike[0].toFixed(1)}°C` : 'Loading...'}
                                            </span>
                                            <Icon icon="mdi:thermometer" className="text-red-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Heat Index</p>
                                        <div className="flex items-center gap-1">
                                            <span className="text-lg font-semibold dark:text-white">
                                                {heatData ? `${heatData.hourly.heatIndex[0].toFixed(1)}°C` : 'Loading...'}
                                            </span>
                                            <Icon icon="mdi:thermometer-high" className="text-red-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Additional Metrics</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full">Real-time</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Humidity</p>
                                            <p className="text-sm font-semibold dark:text-white">
                                                {heatData ? `${heatData.hourly.humidity[0]}%` : 'Loading...'}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">UV Index</p>
                                            <p className="text-sm font-semibold dark:text-white">
                                                {heatData ? heatData.hourly.uvIndex[0] : 'Loading...'}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Solar Radiation</p>
                                            <p className="text-sm font-semibold dark:text-white">
                                                {heatData ? `${heatData.hourly.solarRadiation[0]} W/m²` : 'Loading...'}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Ground Temp</p>
                                            <p className="text-sm font-semibold dark:text-white">
                                                {heatData ? `${heatData.hourly.groundTemperature[0].toFixed(1)}°C` : 'Loading...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <p className="font-medium text-sm text-neutral-600 dark:text-white mb-0 flex items-center gap-2">
                                        {heatData?.temperature?.value && heatData.temperature.value > 35 && (
                                            <span className="inline-flex items-center gap-1 text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 px-2 py-1 rounded-full">
                                                <Icon icon="mdi:alert-circle" className="text-xs" /> Heat Wave Alert
                                            </span>
                                        )}
                                        {heatDataLoading ? 'Loading...' : heatData?.temperature.description || 'Heat wave information'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-6">
                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-red-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Temperature</p>
                                    <h6 className="mb-0 dark:text-white">
                                                    {heatData ? `${heatData.hourly.temperature[0].toFixed(1)}°C` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-red-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:thermometer" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 ${
                                    heatData?.temperature.color === 'green' ? 'text-success-600 dark:text-success-400' :
                                    heatData?.temperature.color === 'yellow' ? 'text-warning-600 dark:text-warning-400' :
                                    heatData?.temperature.color === 'red' ? 'text-danger-600 dark:text-danger-400' :
                                    'text-neutral-600 dark:text-neutral-400'
                                }`}>
                                    <Icon icon="mdi:alert" className="text-xs" /> {heatDataLoading ? 'Loading...' : heatData?.temperature.category}
                                </span>
                                Current Temperature
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-orange-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Feels Like</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.feelsLike[0].toFixed(1)}°C` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-orange-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:thermometer-lines" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                Perceived Temperature
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-amber-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Heat Index</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.heatIndex[0].toFixed(1)}°C` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-amber-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:thermometer-high" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                Heat Stress Level
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-yellow-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Humidity</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.humidity[0].toFixed(1)}%` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-yellow-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:water-percent" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                Relative Humidity
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-green-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Dew Point</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.dewPoint[0].toFixed(1)}°C` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-green-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:water" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                Condensation Point
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-blue-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Pressure</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.pressure[0].toFixed(1)} hPa` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-blue-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:gauge" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                Surface Pressure
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-indigo-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Wind Speed</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.windSpeed[0].toFixed(1)} km/h` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-indigo-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:weather-windy" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                at 10m Height
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-purple-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Wind Gusts</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.windGusts[0].toFixed(1)} km/h` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-purple-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:weather-windy-variant" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                Maximum Speed
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-pink-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">UV Index</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? heatData.hourly.uvIndex[0].toFixed(1) : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-pink-600 rounded-full flex justify-center items-center">
                                    <Icon icon="carbon:uv-index" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                UV Radiation Level
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-rose-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Solar Radiation</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.solarRadiation[0].toFixed(1)} W/m²` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-rose-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:sun-wireless" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                Direct Radiation
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-sky-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Cloud Cover</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.cloudCover[0].toFixed(1)}%` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-sky-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:weather-cloudy" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                Total Cloud Coverage
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-teal-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">Evapotranspiration</p>
                                    <h6 className="mb-0 dark:text-white">
                                        {heatData ? `${heatData.hourly.evapotranspiration[0].toFixed(2)} mm` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-teal-600 rounded-full flex justify-center items-center">
                                    <Icon icon="mdi:water-sync" className="text-white text-2xl mb-0" />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0">
                                Water Evaporation
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="d-footer">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="mb-0 text-neutral-600">
                        © {new Date().getFullYear()} TensersWatch. All Rights Reserved.
                    </p>
                    <p className="mb-0">
                        Powered by{" "}
                        <a href="#" className="text-primary-600 dark:text-primary-600 hover:underline">
                            Tensers
                        </a>
                    </p>
                </div>
            </footer>
        </main>
    );
};

export default HeatWaveDetection; 