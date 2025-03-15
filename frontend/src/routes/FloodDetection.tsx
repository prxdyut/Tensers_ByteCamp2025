import { Icon } from '@iconify/react';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import InteractiveMap from '../components/InteractiveMap';

interface Location {
    lat: number;
    lng: number;
}

interface FloodData {
    waterLevel: number;
    floodRisk: 'Low' | 'Moderate' | 'High' | 'Severe';
    lastUpdated: string;
    precipitation: number;
    flowRate: number;
}

const FloodDetection: React.FC = () => {
    const [location, setLocation] = useState<Location | null>(null);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLImageElement>(null);

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

    // Fetch flood data using React Query
    const { data: floodData, isLoading: floodDataLoading } = useQuery({
        queryKey: ['flood-data', location?.lat, location?.lng],
        queryFn: async () => {
            if (!location) throw new Error('Location not available');
            const response = await axios.get('http://localhost:3000/flood-data', {
                params: {
                    latitude: location.lat,
                    longitude: location.lng
                }
            });
            return response.data as FloodData;
        },
        enabled: !!location,
    });

    // Optimize video stream
    useEffect(() => {
        const updateImage = () => {
            if (videoRef.current) {
                videoRef.current.src = `https://2849-49-248-175-242.ngrok-free.app/video_feed?t=${new Date().getTime()}`;
            }
        };

        // Update image every 1 second
        const interval = setInterval(updateImage, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
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
                    <h6 className="font-semibold mb-0 dark:text-white">Flood Detection</h6>
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
                                Flood Detection
                            </a>
                        </li>
                        <li className="text-neutral-600 dark:text-white">-</li>
                        <li className="text-neutral-600 font-medium dark:text-white">Live Data</li>
                    </ul>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="card h-full xl:col-span-12 2xl:col-span-9">
                        <div className="relative aspect-video rounded-lg overflow-hidden">
                            <img 
                                ref={videoRef}
                                src="https://2849-49-248-175-242.ngrok-free.app/video_feed" 
                                alt="Flood Detection Stream" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.src = `${img.src}?retry=${new Date().getTime()}`;
                                }}
                            />
                            <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span>Live Stream</span>
                                    <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                        Live
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-12 2xl:col-span-3">
                        <InteractiveMap 
                            location={location}
                            onLocationChange={handleLocationChange}
                        />
                        
                        {location && (
                            <div className="card mt-6 rounded-lg border-0 bg-white dark:bg-neutral-800">
                                <div className="card-body p-5">
                                    <h6 className="font-semibold text-lg mb-4 dark:text-white">Flood Analysis</h6>
                                    
                                    {floodDataLoading ? (
                                        <div className="animate-pulse space-y-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                        </div>
                                    ) : floodData ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                                                <span className="text-sm text-neutral-600 dark:text-neutral-300">Water Level</span>
                                                <span className="font-semibold dark:text-white">{floodData.waterLevel}m</span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                                                <span className="text-sm text-neutral-600 dark:text-neutral-300">Flood Risk</span>
                                                <span className={`font-semibold ${
                                                    floodData.floodRisk === 'Low' ? 'text-green-500' :
                                                    floodData.floodRisk === 'Moderate' ? 'text-yellow-500' :
                                                    floodData.floodRisk === 'High' ? 'text-orange-500' :
                                                    'text-red-500'
                                                }`}>
                                                    {floodData.floodRisk}
                                                </span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                                                <span className="text-sm text-neutral-600 dark:text-neutral-300">Precipitation</span>
                                                <span className="font-semibold dark:text-white">{floodData.precipitation}mm/h</span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                                                <span className="text-sm text-neutral-600 dark:text-neutral-300">Flow Rate</span>
                                                <span className="font-semibold dark:text-white">{floodData.flowRate}m³/s</span>
                                            </div>
                                            
                                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-4">
                                                Last updated: {new Date(floodData.lastUpdated).toLocaleString()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-neutral-500 dark:text-neutral-400">
                                            Select a location to view flood analysis data
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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
                        <a
                            href="#"
                            className="text-primary-600 dark:text-primary-600 hover:underline"
                        >
                            Tensers
                        </a>
                    </p>
                </div>
            </footer>
        </main>
    );
};

export default FloodDetection;
