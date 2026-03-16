import React from 'react';

const ServerCard = ({ id, name, iconUrl, memberCount, onClick }) => {
  return (
    <div className="server-card active" onClick={onClick}>
      {iconUrl ? (
        <img src={iconUrl} alt={name} className="server-icon" />
      ) : (
        <div className="server-icon-placeholder">
          {name.charAt(0)}
        </div>
      )}
      <div className="server-details">
        <h3 className="server-name">{name}</h3>
        <p className="server-stats">{memberCount} Members</p>
      </div>
    </div>
  );
};

export default ServerCard;
