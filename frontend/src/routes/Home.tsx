import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import SalesChart from '../components/SalesChart';
import BarChart from '../components/BarChart';
import SubscriberBarChart from '../components/SubscriberBarChart';
import InteractiveMap from '../components/InteractiveMap';
import { Sidebar } from '../components/Sidebar';

// Add interfaces for the data structure
interface WeatherData {
  aqi: {
    value: number;
    category: string;
    color: string;
    description: string;
  };
  hourly: {
    time: string[];
    pm10: number[];
    pm25: number[];
    carbonMonoxide: number[];
    carbonDioxide: number[];
    nitrogenDioxide: number[];
    sulphurDioxide: number[];
    ozone: number[];
    dust: number[];
    uvIndex: number[];
    ammonia: number[];
    methane: number[];
    aerosolOpticalDepth?: number[];
  }
}

interface Location {
  lat: number;
  lng: number;
}

// Helper function to format time
const formatTime = (timeStr: string) => {
  return new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

// Helper function to convert object to array
const objectToArray = (obj: any) => {
  return Array.isArray(obj) ? obj : Object.values(obj);
};

const Home = () => {
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

    // Fetch weather data using React Query
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['stats', location?.lat, location?.lng],
        queryFn: async () => {
            if (!location) throw new Error('Location not available');
            const response = await axios.get('http://localhost:3000/stats', {
                params: {
                    latitude: location.lat,
                    longitude: location.lng
                }
            });
            return response.data as WeatherData;
        },
        enabled: !!location,
    });

    // Format data for charts
    const formatChartData = (statsData: WeatherData | undefined) => {
        if (!statsData) return [];
        return statsData.hourly.time.map((time: string, index: number) => ({
            time: formatTime(time),
            pm10: statsData.hourly.pm10[index],
            pm25: statsData.hourly.pm25[index],
            carbonMonoxide: statsData.hourly.carbonMonoxide[index],
            carbonDioxide: statsData.hourly.carbonDioxide[index],
            ozone: statsData.hourly.ozone[index],
            uvIndex: statsData.hourly.uvIndex[index],
            methane: statsData.hourly.methane[index],
        }));
    };

    useEffect(() => {
      // Add stylesheets
      const stylesheets = [
        "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
        "assets/css/style.css"
      ];

      stylesheets.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      });

      // Add scripts
      const scripts = [
        "assets/js/app.js",
      ];

      scripts.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        document.body.appendChild(script);
      });

      // Cleanup function to remove added elements when component unmounts
      return () => {
        stylesheets.forEach(href => {
          const link = document.querySelector(`link[href="${href}"]`);
          if (link) link.remove();
        });

        scripts.forEach(src => {
          const script = document.querySelector(`script[src="${src}"]`);
          if (script) script.remove();
        });
      };
    }, []);
    return <>
        <Sidebar />
        <main className="dashboard-main">
            <div className="navbar-header border-b border-neutral-200 dark:border-neutral-600">
                <div className="flex items-center justify-between">
                    <div className="col-auto">
                        <div className="flex flex-wrap items-center gap-[16px]">
                            <button type="button" className="sidebar-toggle">
                                <Icon
                                    icon="heroicons:bars-3-solid"
                                    className="icon non-active"
                                />
                                <Icon
                                    icon="iconoir:arrow-right"
                                    className="icon active"
                                />
                            </button>
                            <button
                                type="button"
                                className="sidebar-mobile-toggle d-flex !leading-[0]"
                            >
                                <Icon
                                    icon="heroicons:bars-3-solid"
                                    className="icon !text-[30px]"
                                />
                            </button>
                            <form className="navbar-search">
                                <input type="text" name="search" placeholder="Search location..." />
                                <Icon icon="ion:location-outline" className="icon" />
                            </form>
                        </div>
                    </div>
                    <div className="col-auto">
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                id="theme-toggle"
                                className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 dark:text-white rounded-full flex justify-center items-center"
                            >
                                <span id="theme-toggle-dark-icon" className="hidden">
                                    <i className="ri-sun-line" />
                                </span>
                                <span id="theme-toggle-light-icon" className="hidden">
                                    <i className="ri-moon-line" />
                                </span>
                            </button>
                            <button
                                data-dropdown-toggle="dropdownNotification"
                                className="has-indicator w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full flex justify-center items-center"
                                type="button"
                            >
                                <Icon
                                    icon="mdi:weather-cloudy-alert"
                                    className="text-neutral-900 dark:text-white text-xl"
                                />
                            </button>
                            <button
                                data-dropdown-toggle="dropdownProfile"
                                className="flex justify-center items-center rounded-full"
                                type="button"
                            >
                                <img
                                    src="assets/images/user.png"
                                    alt="image"
                                    className="w-10 h-10 object-fit-cover rounded-full"
                                />
                            </button>
                                    </div>
                    </div>
                </div>
            </div>
            <div className="dashboard-main-body">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                    <h6 className="font-semibold mb-0 dark:text-white">Environmental Monitoring Dashboard</h6>
                    <ul className="flex items-center gap-[6px]">
                        <li className="font-medium">
                            <a
                                href="index-2.html"
                                className="flex items-center gap-2 text-neutral-600 hover:text-primary-600 dark:text-white dark:hover:text-primary-600"
                            >
                                <Icon
                                    icon="carbon:cloud-satellite"
                                    className="icon text-lg"
                                />
                                Weather Monitor
                            </a>
                        </li>
                        <li className="text-neutral-600 dark:text-white">-</li>
                        <li className="text-neutral-600 font-medium dark:text-white">Live Data</li>
                    </ul>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 ">
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
                                    <Icon icon="carbon:weather-station" className="w-full h-full" />
                                </div>
                                
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <h5 className="font-semibold text-lg text-neutral-900 dark:text-white">Overview</h5>
                                        <span className="px-2 py-1 text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100 rounded-full">Live</span>
                                    </div>
                                    <button className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-300 dark:hover:text-white transition-colors">
                                        <Icon icon="heroicons:ellipsis-horizontal" className="text-xl" />
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div>
                                        <p className="font-medium text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
                                            Air Quality Index
                                            <Icon icon="heroicons:information-circle" className="text-neutral-400 text-lg" />
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <h6 className="text-2xl font-bold mb-0 dark:text-white">
                                                {statsLoading ? 'Loading...' : statsData?.aqi.value}
                                            </h6>
                                            <span className={`text-xs font-medium ${
                                                statsData?.aqi.color === 'green' ? 'text-success-600 dark:text-success-400' :
                                                statsData?.aqi.color === 'yellow' ? 'text-warning-600 dark:text-warning-400' :
                                                statsData?.aqi.color === 'red' ? 'text-danger-600 dark:text-danger-400' :
                                                'text-neutral-600 dark:text-neutral-400'
                                            }`}>
                                                {statsLoading ? '' : statsData?.aqi.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-y border-neutral-100 dark:border-neutral-700">
                                    <div>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">PM2.5</p>
                                        <div className="flex items-center gap-1">
                                            <span className="text-lg font-semibold dark:text-white">
                                                {statsData ? `${statsData.hourly.pm25[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                            </span>
                                            <Icon icon="mdi:molecule" className="text-cyan-600" />
                                        </div>
                                        <span className="text-xs text-warning-600 dark:text-warning-400">
                                            {statsLoading ? 'Loading...' : 'Moderate level'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">PM10</p>
                                        <div className="flex items-center gap-1">
                                            <span className="text-lg font-semibold dark:text-white">
                                                {statsData ? `${statsData.hourly.pm10[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                            </span>
                                            <Icon icon="mdi:molecule" className="text-cyan-600" />
                                        </div>
                                        <span className="text-xs text-warning-600 dark:text-warning-400">
                                            {statsLoading ? 'Loading...' : 'Moderate level'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Gas Levels</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full">Real-time</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">CO</p>
                                            <p className="text-sm font-semibold dark:text-white">
                                                {statsData ? `${statsData.hourly.carbonMonoxide[0]?.toFixed(1)} ppb` : 'Loading...'}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">NO2</p>
                                            <p className="text-sm font-semibold dark:text-white">
                                                {statsData ? `${statsData.hourly.nitrogenDioxide[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400">O3</p>
                                            <p className="text-sm font-semibold dark:text-white">
                                                {statsData ? `${statsData.hourly.ozone[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <p className="font-medium text-sm text-neutral-600 dark:text-white mb-0 flex items-center gap-2">
                                        {statsData?.aqi?.value && statsData.aqi.value > 100 && (
                                            <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20 px-2 py-1 rounded-full">
                                                <Icon icon="mdi:alert-circle" className="text-xs" /> Alert
                                            </span>
                                        )}
                                        {statsLoading ? 'Loading...' : statsData?.aqi?.description || 'Air quality information'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-6">
                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-cyan-600/10 to-bg-white">
                            <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        PM10
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.pm10[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                    </h6>
                                    </div>
                                <div className="w-[50px] h-[50px] bg-cyan-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:molecule"
                                        className="text-white text-2xl mb-0"
                                    />
                                        </div>
                                        </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400">
                                    <Icon icon="mdi:alert" className="text-xs" /> {statsLoading ? 'Loading...' : 'Moderate'}
                                </span>
                                Particulate Matter
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-purple-600/10 to-bg-white">
                            <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        PM2.5
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.pm25[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                    </h6>
                                    </div>
                                <div className="w-[50px] h-[50px] bg-purple-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:molecule"
                                        className="text-white text-2xl mb-0"
                                    />
                                </div>
                                        </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400">
                                    <Icon icon="mdi:alert" className="text-xs" /> {statsLoading ? 'Loading...' : 'Moderate'}
                                </span>
                                Fine Particulate Matter
                            </p>
                    </div>
                </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-blue-600/10 to-bg-white">
                            <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        CO
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.carbonMonoxide[0]?.toFixed(1)} ppb` : 'Loading...'}
                                    </h6>
                                    </div>
                                <div className="w-[50px] h-[50px] bg-blue-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:molecule-co"
                                        className="text-white text-2xl mb-0"
                                    />
                                </div>
                                        </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                                    <Icon icon="mdi:check-circle" className="text-xs" /> {statsLoading ? 'Loading...' : 'Good'}
                                </span>
                                Carbon Monoxide
                            </p>
                                        </div>
                                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-green-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        CO2
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.carbonDioxide[0]?.toFixed(1)} ppm` : 'Loading...'}
                                    </h6>
                                        </div>
                                <div className="w-[50px] h-[50px] bg-green-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:molecule-co2"
                                        className="text-white text-2xl mb-0"
                                    />
                                    </div>
                                        </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400">
                                    <Icon icon="mdi:alert" className="text-xs" /> {statsLoading ? 'Loading...' : 'Elevated'}
                                </span>
                                Carbon Dioxide
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-yellow-600/10 to-bg-white">
                            <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        NO2
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.nitrogenDioxide[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                    </h6>
                                    </div>
                                <div className="w-[50px] h-[50px] bg-yellow-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:molecule"
                                        className="text-white text-2xl mb-0"
                                    />
                                </div>
                                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                                    <Icon icon="mdi:check-circle" className="text-xs" /> {statsLoading ? 'Loading...' : 'Good'}
                                </span>
                                Nitrogen Dioxide
                            </p>
                                            </div>
                                        </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-orange-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        SO2
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.sulphurDioxide[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                    </h6>
                                            </div>
                                <div className="w-[50px] h-[50px] bg-orange-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:molecule"
                                        className="text-white text-2xl mb-0"
                                    />
                                            </div>
                                        </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                                    <Icon icon="mdi:check-circle" className="text-xs" /> {statsLoading ? 'Loading...' : 'Good'}
                                </span>
                                Sulphur Dioxide
                            </p>
                    </div>
                </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-indigo-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        O3
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.ozone[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-indigo-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:molecule"
                                        className="text-white text-2xl mb-0"
                                    />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400">
                                    <Icon icon="mdi:alert" className="text-xs" /> {statsLoading ? 'Loading...' : 'Moderate'}
                                </span>
                                Ozone
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-teal-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        AOD
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.aerosolOpticalDepth?.[0]?.toFixed(2)}` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-teal-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:weather-hazy"
                                        className="text-white text-2xl mb-0"
                                    />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                                    <Icon icon="mdi:check-circle" className="text-xs" /> {statsLoading ? 'Loading...' : 'Good'}
                                </span>
                                Aerosol Optical Depth
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-amber-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        Dust
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.dust[0]?.toFixed(1)} µg/m³` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-amber-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:weather-dust"
                                        className="text-white text-2xl mb-0"
                                    />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                                    <Icon icon="mdi:check-circle" className="text-xs" /> {statsLoading ? 'Loading...' : 'Good'}
                                </span>
                                Airborne Particles
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-red-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        UV Index
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.uvIndex[0]?.toFixed(1)}` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-red-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="carbon:uv-index"
                                        className="text-white text-2xl mb-0"
                                    />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400">
                                    <Icon icon="mdi:alert" className="text-xs" /> {statsLoading ? 'Loading...' : 'High'}
                                </span>
                                UV Radiation Level
                            </p>
                        </div>
                    </div>

                    <div className="card shadow-none border border-gray-200 dark:border-neutral-600 dark:bg-neutral-700 rounded-lg h-full bg-gradient-to-r from-emerald-600/10 to-bg-white">
                        <div className="card-body p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-medium text-neutral-900 dark:text-white mb-1">
                                        CH4
                                    </p>
                                    <h6 className="mb-0 dark:text-white">
                                        {statsData ? `${statsData.hourly.methane[0]?.toFixed(1)} ppb` : 'Loading...'}
                                    </h6>
                                </div>
                                <div className="w-[50px] h-[50px] bg-emerald-600 rounded-full flex justify-center items-center">
                                    <Icon
                                        icon="mdi:molecule"
                                        className="text-white text-2xl mb-0"
                                    />
                                </div>
                            </div>
                            <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400">
                                    <Icon icon="mdi:alert" className="text-xs" /> {statsLoading ? 'Loading...' : 'Elevated'}
                                </span>
                                Methane
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <footer className="d-footer">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="mb-0 text-neutral-600">
                        © {new Date().getFullYear()} WeatherWatch. All Rights Reserved.
                    </p>
                    <p className="mb-0">
                        Powered by{" "}
                        <a
                            href="#"
                            className="text-primary-600 dark:text-primary-600 hover:underline"
                        >
                            Environmental Monitoring Systems
                        </a>
                    </p>
                </div>
            </footer>
        </main>
    </>

};

export default Home;