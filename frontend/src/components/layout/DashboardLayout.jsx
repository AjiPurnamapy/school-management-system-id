import React from 'react';
import Sidebar from '../dashboard/Sidebar';
import Header from '../dashboard/Header';

const DashboardLayout = ({ 
    children, 
    user, 
    activeTab, 
    setActiveTab, 
    onLogout, 
    onUploadPhoto 
}) => {
    return (
        <div className="dashboard-wrapper">
             <div className="dashboard-content">
                 <Sidebar 
                    user={user}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onLogout={onLogout}
                    onUploadPhoto={onUploadPhoto}
                 />
                 
                 <div className="dashboard-main">
                    <Header user={user} />
                    {children}
                 </div>
             </div>
        </div>
    );
};

export default DashboardLayout;
