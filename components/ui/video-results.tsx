"use client"

import { useState } from 'react'
import { Play, ExternalLink, Video } from 'lucide-react'

// Video search result data structure from backend API
export interface VideoItem {
  title: string
  video_url: string
  thumbnail_url: string
  platform: string
  is_creator_content: boolean
  description?: string | null
  duration?: string | null
  view_count?: string | null
}

export interface WebSearchContent {
  youtube_channel_url: string | null
  twitch_channel_url: string | null
  additional_links: string[]
  extraction_metadata: {
    sources_found: number
    extraction_successful: boolean
  }
}

export interface VideoSearchData {
  query: string
  total_results: number
  creator_results_count: number
  items: VideoItem[]
  search_metadata: {
    primary_search_successful: boolean
    fallback_search_used: boolean
    web_search_supplemented: boolean
  }
  web_search_content: WebSearchContent
}

interface VideoSearchResultsProps {
  data: VideoSearchData
}

// Individual video card component
function VideoCard({ video }: { video: VideoItem }) {
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">YT</div>
      case 'twitch':
        return <div className="w-4 h-4 bg-purple-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">TW</div>
      default:
        return <Video className="w-4 h-4" />
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return 'text-red-400 border-red-400/30 bg-red-400/10'
      case 'twitch':
        return 'text-purple-400 border-purple-400/30 bg-purple-400/10'
      default:
        return 'text-blue-400 border-blue-400/30 bg-blue-400/10'
    }
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const handleVideoClick = () => {
    window.open(video.video_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className="floating-card group relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Creator Badge */}
      {video.is_creator_content && (
        <div className="absolute top-3 right-3 z-10 px-3 py-1 bg-chimera-matrix-green/90 text-black text-xs font-bold rounded-full shadow-lg font-inter"
             style={{ boxShadow: '0 0 12px var(--chimera-matrix-green)' }}>
          🎯 Creator Content
        </div>
      )}

      {/* Thumbnail Section */}
      <div className="relative aspect-video bg-black/50 overflow-hidden cursor-pointer" onClick={handleVideoClick}>
        {!imageError ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400">
              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No Thumbnail</p>
            </div>
          </div>
        )}

        {/* Play Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center transform transition-transform duration-300 hover:scale-110 shadow-lg"
               style={{
                 backgroundColor: 'var(--chimera-matrix-green)',
                 boxShadow: '0 0 20px var(--chimera-matrix-green)'
               }}>
            <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Video Info Section */}
      <div className="p-4">
        <h3 className="text-chimera-primary font-medium text-sm leading-tight mb-2 line-clamp-2 group-hover:text-chimera-matrix transition-colors duration-300 cursor-pointer font-inter" onClick={handleVideoClick}>
          {video.title}
        </h3>

        <div className="flex items-center justify-between">
          {/* Platform Badge */}
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getPlatformColor(video.platform)}`}>
            {getPlatformIcon(video.platform)}
            {video.platform}
          </div>

          {/* External Link */}
          <button
            onClick={handleVideoClick}
            className="inline-flex items-center gap-1 text-xs text-matrix-green hover:text-green-300 transition-colors duration-300 font-medium"
          >
            <ExternalLink className="w-3 h-3" />
            Watch
          </button>
        </div>
      </div>
    </div>
  )
}

// Main video search results component
export function VideoSearchResults({ data }: VideoSearchResultsProps) {
  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="video-results-container p-6 bg-gradient-to-br from-black/60 to-gray-900/60 border border-matrix-green/20 rounded-xl">
        <div className="text-center text-gray-400">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No video results found.</p>
          <p className="text-xs mt-1 opacity-70">Try refining your search terms.</p>
        </div>
      </div>
    )
  }

  const creatorVideos = data.items.filter(video => video.is_creator_content)
  const relatedVideos = data.items.filter(video => !video.is_creator_content)

  return (
    <div className="video-results-container w-full max-w-6xl">
      {/* Header */}
      <div className="floating-card p-6 mb-6">
        <h2 className="text-2xl font-bold text-chimera-matrix mb-3 font-orbitron">🎥 Video Search Results</h2>
        <div className="flex items-center gap-4 text-sm text-chimera-secondary">
          <span>Found {data.total_results} videos</span>
          {data.creator_results_count > 0 && (
            <span className="text-chimera-matrix">• {data.creator_results_count} creator-specific</span>
          )}
          {data.search_metadata.web_search_supplemented && (
            <span className="text-chimera-cyan">• Enhanced with web search</span>
          )}
        </div>
      </div>

      {/* Creator Videos Section */}
      {creatorVideos.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-matrix-green mb-4 flex items-center gap-2 font-orbitron">
            🎯 Videos by/featuring the Creator
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creatorVideos.map((video, index) => (
              <VideoCard key={`creator-${index}`} video={video} />
            ))}
          </div>
        </div>
      )}

      {/* Related Videos Section */}
      {relatedVideos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2 font-orbitron">
            🔍 Related Videos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {relatedVideos.map((video, index) => (
              <VideoCard key={`related-${index}`} video={video} />
            ))}
          </div>
        </div>
      )}

      {/* Creator Channels Section */}
      {data.web_search_content && data.web_search_content.extraction_metadata.extraction_successful && (
        <div className="mt-8 p-4 bg-gradient-to-r from-matrix-green/10 to-green-400/10 border border-matrix-green/30 rounded-lg">
          <h4 className="text-md font-semibold text-matrix-green mb-3 flex items-center gap-2 font-orbitron">
            🔗 Creator Channels & Links
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* YouTube Channel */}
            {data.web_search_content.youtube_channel_url && (
              <a
                href={data.web_search_content.youtube_channel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-400/30 rounded-lg hover:bg-red-900/30 transition-colors group"
              >
                <div className="w-8 h-8 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                  YT
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-red-400 group-hover:text-red-300">YouTube Channel</div>
                  <div className="text-xs text-gray-400 truncate">Visit creator's channel</div>
                </div>
                <ExternalLink className="w-4 h-4 text-red-400 group-hover:text-red-300" />
              </a>
            )}

            {/* Twitch Channel */}
            {data.web_search_content.twitch_channel_url && (
              <a
                href={data.web_search_content.twitch_channel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-purple-900/20 border border-purple-400/30 rounded-lg hover:bg-purple-900/30 transition-colors group"
              >
                <div className="w-8 h-8 bg-purple-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                  TW
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-purple-400 group-hover:text-purple-300">Twitch Channel</div>
                  <div className="text-xs text-gray-400 truncate">Watch live streams</div>
                </div>
                <ExternalLink className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
              </a>
            )}
          </div>

          {/* Additional Links */}
          {data.web_search_content.additional_links.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-300 mb-2">Additional Resources:</div>
              <div className="space-y-2">
                {data.web_search_content.additional_links.map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{link.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Tips */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-400/20 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="text-blue-400 mt-0.5">💡</div>
          <div className="text-sm text-gray-300">
            <strong className="text-blue-400">Tip:</strong> {
              creatorVideos.length === 0
                ? "No creator-specific videos found. Try searching for the creator's channel name or check if the spelling is correct."
                : "Click any thumbnail or title to watch the video directly. Creator-specific content is highlighted with badges."
            }
          </div>
        </div>
      </div>
    </div>
  )
}
