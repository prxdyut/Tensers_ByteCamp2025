import { Icon } from '@iconify/react';

const menuItems = [
    {
        title: "Dashboard",
        icon: "solar:home-smile-angle-outline",
        link: "dashboard.html"
    },
    {
        title: "AI Doctor",
        icon: "healthicons:doctor",
        link: "ai-doctor.html"
    },
    {
        title: "Voice Analyser", 
        icon: "carbon:audio-console",
        link: "voice-analyser.html"
    },
    {
        title: "Heat Wave Detection",
        icon: "wi:thermometer",
        link: "heat-wave.html"
    },
    {
        title: "Blog & Articles",
        icon: "ph:newspaper",
        link: "blog.html"
    }
];

const Sidebar = () => {
    return <aside className="sidebar">
        <button type="button" className="sidebar-close-btn !mt-4">
            <Icon icon="radix-icons:cross-2" />
        </button>
        <div>
            <a href="index-2.html" className="sidebar-logo">
                <img
                    src="assets/images/logo.png"
                    alt="site logo"
                    className="light-logo"
                />
                <img
                    src="assets/images/logo-light.png"
                    alt="site logo"
                    className="dark-logo"
                />
                <img
                    src="assets/images/logo-icon.png"
                    alt="site logo"
                    className="logo-icon"
                />
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