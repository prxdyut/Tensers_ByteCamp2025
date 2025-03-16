import { Icon } from '@iconify/react';

const menuItems = [
    {
        title: "Dashboard",
        icon: "solar:home-smile-angle-outline",
        link: "/"
    },
    {
        title: "Flood Detection",
        icon: "carbon:cloud-satellite",
        link: "/flood-detection"
    },
    {
        title: "AI Doctor",
        icon: "healthicons:doctor",
        link: "ai-doctor.html"
    },
    {
        title: "Voice Analyser", 
        icon: "carbon:audio-console",
        link: "/voice-analyser"
    },
    {
        title: "Heat Wave Detection",
        icon: "wi:thermometer",
        link: "/heatwave-detection"
    },
    {
        title: "Blog & Articles",
        icon: "ph:newspaper",
        link: "/read"
    }
];

const Sidebar = () => {
    return <aside className="sidebar">
        <button type="button" className="sidebar-close-btn !mt-4">
            <Icon icon="radix-icons:cross-2" />
        </button>
        <div>
            <a href="index-2.html" className="sidebar-logo">
                {/* <img
                    src="assets/imaes/logo.png"
                    alt="site logo"
                    className="light-logo"
                /> */}
                {/* <img
                    src="assets/iages/logo-light.png"
                    alt="site logo"
                    className="dark-logo"
                /> */}
                {/* <img
                    src="assets/image/logo-icon.png"
                    alt="site logo"
                    className="logo-icon"
                /> */}
            </a>
        </div>
        <div className="sidebar-menu-area">
            <ul className="sidebar-menu" id="sidebar-menu">
                {menuItems.map((item, index) => (
                    <li key={index}>
                        <a href={item.link}>
                            <Icon icon={item.icon} className="menu-icon" />
                            <span>{item.title}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    </aside>;
};

export { Sidebar };