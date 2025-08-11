# Ads Feature - Client-Side Implementation Guide

## Overview
The ads system supports banner, sidebar, popup, and inline advertisements with targeting options, analytics tracking, and admin management capabilities.

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Get Active Ads
```
GET /ads/active?placement={placement}&type={type}
```

**Query Parameters:**
- `placement` (optional): `"home"`, `"playgrounds"`, `"profile"`, `"chat"`, `"all"`
- `type` (optional): `"banner"`, `"sidebar"`, `"popup"`, `"inline"`

**Response:**
```json
{
  "status": "success",
  "results": 3,
  "data": [
    {
      "_id": "ad_id",
      "title": "Summer Sale!",
      "description": "Get 50% off all playground bookings",
      "image": "ad-image.jpeg",
      "link": "https://example.com/sale",
      "type": "banner",
      "placement": "home",
      "priority": 5,
      "ctr": "2.45",
      "isCurrentlyActive": true
    }
  ]
}
```

#### 2. Track Ad Impression
```
PATCH /ads/{adId}/impression
```

**Purpose:** Call when an ad is displayed to the user

#### 3. Track Ad Click
```
PATCH /ads/{adId}/click
```

**Response:**
```json
{
  "status": "success",
  "message": "Click tracked",
  "data": {
    "link": "https://example.com/destination"
  }
}
```

### Admin Endpoints (Require Authentication + Admin Role)

#### 4. Get All Ads (Admin)
```
GET /ads
Authorization: Bearer {jwt_token}
```

**Query Parameters (filtering/sorting):**
- `isActive=true/false`
- `type=banner`
- `placement=home`
- `sort=-priority,-createdAt`
- `fields=title,description,clickCount`
- `page=1&limit=10`

#### 5. Create New Ad (Admin)
```
POST /ads
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

Form Data:
- title: "Ad Title"
- description: "Ad Description"
- image: [file upload]
- link: "https://example.com"
- type: "banner"
- placement: "home"
- startDate: "2025-01-01"
- endDate: "2025-12-31"
- priority: 5
- targetAudience[userRole]: "all"
- targetAudience[minAge]: 18
- targetAudience[maxAge]: 65
```

#### 6. Update Ad (Admin)
```
PATCH /ads/{adId}
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data
```

#### 7. Delete Ad (Admin)
```
DELETE /ads/{adId}
Authorization: Bearer {jwt_token}
```

#### 8. Toggle Ad Status (Admin)
```
PATCH /ads/{adId}/toggle-status
Authorization: Bearer {jwt_token}
```

#### 9. Get Ad Analytics (Admin)
```
GET /ads/{adId}/analytics
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "ad_id",
    "title": "Summer Sale!",
    "impressions": 1250,
    "clicks": 45,
    "ctr": "3.60",
    "isActive": true,
    "daysRunning": 15
  }
}
```

#### 10. Get Overall Ads Statistics (Admin)
```
GET /ads/stats/overview
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "overview": {
      "totalAds": 25,
      "activeAds": 18,
      "totalImpressions": 45000,
      "totalClicks": 1200,
      "avgCTR": 2.67
    },
    "byType": [
      {
        "_id": "banner",
        "count": 12,
        "impressions": 25000,
        "clicks": 800
      }
    ],
    "byPlacement": [
      {
        "_id": "home",
        "count": 8,
        "impressions": 15000,
        "clicks": 450
      }
    ]
  }
}
```

---

## Client-Side Implementation

### 1. Ad Display Component (React Example)

```jsx
import React, { useState, useEffect } from 'react';

const AdDisplay = ({ placement = 'all', type = 'banner' }) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAds();
  }, [placement, type]);

  const fetchAds = async () => {
    try {
      const response = await fetch(`/ads/active?placement=${placement}&type=${type}`);
      const data = await response.json();
      setAds(data.data || []);
      
      // Track impressions for all loaded ads
      data.data?.forEach(ad => trackImpression(ad._id));
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackImpression = async (adId) => {
    try {
      await fetch(`/ads/${adId}/impression`, { method: 'PATCH' });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };

  const handleAdClick = async (ad) => {
    try {
      const response = await fetch(`/ads/${ad._id}/click`, { method: 'PATCH' });
      const data = await response.json();
      
      if (data.data?.link) {
        window.open(data.data.link, '_blank');
      }
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  if (loading) return <div className="ad-skeleton">Loading ads...</div>;
  if (!ads.length) return null;

  return (
    <div className={`ads-container ads-${type}`}>
      {ads.map(ad => (
        <div 
          key={ad._id} 
          className={`ad-item ad-${type}`}
          onClick={() => handleAdClick(ad)}
          style={{ cursor: ad.link ? 'pointer' : 'default' }}
        >
          <img 
            src={`/static/img/ads/${ad.image}`} 
            alt={ad.title}
            className="ad-image"
          />
          <div className="ad-content">
            <h3 className="ad-title">{ad.title}</h3>
            <p className="ad-description">{ad.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdDisplay;
```

### 2. Admin Ad Management Component

```jsx
import React, { useState, useEffect } from 'react';

const AdManager = () => {
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchAds();
    fetchStats();
  }, []);

  const fetchAds = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/ads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAds(data.data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/ads/stats/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const toggleAdStatus = async (adId) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/ads/${adId}/toggle-status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAds(); // Refresh list
    } catch (error) {
      console.error('Error toggling ad status:', error);
    }
  };

  const deleteAd = async (adId) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/ads/${adId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchAds(); // Refresh list
    } catch (error) {
      console.error('Error deleting ad:', error);
    }
  };

  return (
    <div className="ad-manager">
      {/* Stats Overview */}
      {stats && (
        <div className="stats-overview">
          <div className="stat-card">
            <h3>Total Ads</h3>
            <p>{stats.overview.totalAds}</p>
          </div>
          <div className="stat-card">
            <h3>Active Ads</h3>
            <p>{stats.overview.activeAds}</p>
          </div>
          <div className="stat-card">
            <h3>Total Impressions</h3>
            <p>{stats.overview.totalImpressions?.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>Total Clicks</h3>
            <p>{stats.overview.totalClicks?.toLocaleString()}</p>
          </div>
          <div className="stat-card">
            <h3>Average CTR</h3>
            <p>{stats.overview.avgCTR?.toFixed(2)}%</p>
          </div>
        </div>
      )}

      {/* Ads List */}
      <div className="ads-list">
        <div className="list-header">
          <h2>Manage Ads</h2>
          <button onClick={() => setShowCreateForm(true)}>
            Create New Ad
          </button>
        </div>

        {ads.map(ad => (
          <div key={ad._id} className="ad-row">
            <img src={`/static/img/ads/${ad.image}`} alt={ad.title} />
            <div className="ad-info">
              <h4>{ad.title}</h4>
              <p>{ad.description}</p>
              <span className={`status ${ad.isCurrentlyActive ? 'active' : 'inactive'}`}>
                {ad.isCurrentlyActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="ad-stats">
              <p>Impressions: {ad.impressionCount}</p>
              <p>Clicks: {ad.clickCount}</p>
              <p>CTR: {ad.ctr}%</p>
            </div>
            <div className="ad-actions">
              <button onClick={() => toggleAdStatus(ad._id)}>
                {ad.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => deleteAd(ad._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <AdCreateForm 
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchAds();
          }}
        />
      )}
    </div>
  );
};
```

### 3. Ad Creation Form Component

```jsx
const AdCreateForm = ({ onClose, onSuccess, editingAd = null }) => {
  const [formData, setFormData] = useState({
    title: editingAd?.title || '',
    description: editingAd?.description || '',
    link: editingAd?.link || '',
    type: editingAd?.type || 'banner',
    placement: editingAd?.placement || 'all',
    startDate: editingAd?.startDate?.split('T')[0] || '',
    endDate: editingAd?.endDate?.split('T')[0] || '',
    priority: editingAd?.priority || 1,
    'targetAudience[userRole]': editingAd?.targetAudience?.userRole || 'all',
    'targetAudience[minAge]': editingAd?.targetAudience?.minAge || '',
    'targetAudience[maxAge]': editingAd?.targetAudience?.maxAge || ''
  });
  const [imageFile, setImageFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key]) formDataToSend.append(key, formData[key]);
    });
    
    if (imageFile) {
      formDataToSend.append('image', imageFile);
    }

    try {
      const token = localStorage.getItem('authToken');
      const url = editingAd ? `/ads/${editingAd._id}` : '/ads';
      const method = editingAd ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.message || 'Error saving ad');
      }
    } catch (error) {
      console.error('Error saving ad:', error);
      alert('Error saving ad');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{editingAd ? 'Edit Ad' : 'Create New Ad'}</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ad Title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
          
          <textarea
            placeholder="Ad Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
          />
          
          <input
            type="url"
            placeholder="Link URL (optional)"
            value={formData.link}
            onChange={(e) => setFormData({...formData, link: e.target.value})}
          />
          
          <select
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="banner">Banner</option>
            <option value="sidebar">Sidebar</option>
            <option value="popup">Popup</option>
            <option value="inline">Inline</option>
          </select>
          
          <select
            value={formData.placement}
            onChange={(e) => setFormData({...formData, placement: e.target.value})}
          >
            <option value="all">All Pages</option>
            <option value="home">Home</option>
            <option value="playgrounds">Playgrounds</option>
            <option value="profile">Profile</option>
            <option value="chat">Chat</option>
          </select>
          
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            required={!editingAd}
          />
          
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
          />
          
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
          />
          
          <input
            type="number"
            min="1"
            max="10"
            placeholder="Priority (1-10)"
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value})}
          />
          
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">{editingAd ? 'Update' : 'Create'} Ad</button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### 4. CSS Styling Examples

```css
/* Ad Display Styles */
.ads-container {
  margin: 20px 0;
}

.ads-banner .ad-item {
  display: flex;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 15px;
  cursor: pointer;
  transition: transform 0.2s;
}

.ads-banner .ad-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.ads-sidebar .ad-item {
  width: 300px;
  margin-bottom: 20px;
}

.ads-popup .ad-item {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.ad-image {
  width: 200px;
  height: 100px;
  object-fit: cover;
}

.ad-content {
  padding: 15px;
}

.ad-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
}

.ad-description {
  color: #666;
  font-size: 14px;
}

/* Admin Panel Styles */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.ad-row {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 10px;
}

.ad-row img {
  width: 80px;
  height: 40px;
  object-fit: cover;
  margin-right: 15px;
}

.ad-info {
  flex: 1;
}

.status.active {
  color: green;
  font-weight: bold;
}

.status.inactive {
  color: red;
}

.ad-actions button {
  margin-left: 10px;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
```

### 5. Usage in Different Pages

```jsx
// Home page
<AdDisplay placement="home" type="banner" />

// Sidebar
<AdDisplay placement="all" type="sidebar" />

// Between content
<AdDisplay placement="playgrounds" type="inline" />

// Admin dashboard
{userRole === 'admin' && <AdManager />}
```

### 6. Error Handling & Best Practices

```jsx
const AdDisplay = ({ placement, type }) => {
  const [ads, setAds] = useState([]);
  const [error, setError] = useState(null);

  const fetchAds = async () => {
    try {
      setError(null);
      const response = await fetch(`/ads/active?placement=${placement}&type=${type}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch ads');
      }
      
      const data = await response.json();
      setAds(data.data || []);
      
      // Track impressions with error handling
      data.data?.forEach(ad => {
        trackImpression(ad._id).catch(err => 
          console.warn('Failed to track impression for ad:', ad._id)
        );
      });
    } catch (error) {
      setError(error.message);
      console.error('Error fetching ads:', error);
    }
  };

  // Graceful degradation
  if (error) {
    return null; // Don't show anything if ads fail to load
  }

  return ads.length > 0 ? (
    <div className={`ads-container ads-${type}`}>
      {ads.map(ad => (
        <AdItem key={ad._id} ad={ad} onError={() => setError('Ad display error')} />
      ))}
    </div>
  ) : null;
};
```

---

## Testing Checklist

### Frontend Testing:
- [ ] Ads display correctly on different pages
- [ ] Impression tracking works when ads are viewed
- [ ] Click tracking works and opens correct links
- [ ] Admin can create/edit/delete ads
- [ ] Image uploads work properly
- [ ] Analytics display correctly
- [ ] Responsive design on mobile devices
- [ ] Error handling for failed API calls

### Backend Testing:
- [ ] Public endpoints work without authentication
- [ ] Admin endpoints require proper authentication
- [ ] Image upload and resizing works
- [ ] Analytics calculations are correct
- [ ] Date filtering works for active ads
- [ ] Targeting options filter correctly
- [ ] Database indexes perform well

---

## Security Considerations

1. **Image Upload Security:**
   - Only allow image file types
   - Limit file size (5MB max)
   - Resize images to prevent large uploads

2. **Admin Access:**
   - Verify admin role for management endpoints
   - Validate all input data

3. **Click Tracking:**
   - Validate ad IDs exist before tracking
   - Rate limit tracking endpoints to prevent abuse

4. **Content Security:**
   - Sanitize ad titles and descriptions
   - Validate URLs for external links

This comprehensive guide should help the client-side developer implement the complete ads feature with proper tracking, admin management, and error handling.
