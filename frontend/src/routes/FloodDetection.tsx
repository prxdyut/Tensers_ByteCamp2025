import { Icon } from '@iconify/react';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import InteractiveMap from '../components/InteractiveMap';
const ngrock = "https://2974-136-232-248-186.ngrok-free.app/video_feed"

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
    const [initialId, setInitialId] = useState(1);
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
        setInitialId(prevId => prevId + 1);
    };

    // Optimize video stream
    useEffect(() => {
        const updateImage = () => {
            if (videoRef.current) {
                videoRef.current.src = `${ngrock}/${initialId}?t=${new Date().getTime()}`;
            }
        };

        // Update image every 1 second
        const interval = setInterval(updateImage, 1000);

        return () => clearInterval(interval);
    }, [initialId]);

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
                                src={ngrock}
                                alt="Flood Detection Stream"
                                className="w-full h-full object-cover"
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
