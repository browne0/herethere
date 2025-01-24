export interface TikTokResponse {
  data: {
    id: string;
    description: string;
    is_commerce: boolean;
    video_count: number;
    view_count: number;
    posts: Post[];
  };
}

interface Post {
  added_sound_music_info: MusicInfo;
  aigc_info: {
    aigc_label_type: number;
    created_by_ai: boolean;
  };
  anchors: null;
  animated_image_info: {
    effect: number;
    type: number;
  };
  author: Author;
  author_user_id: number;
  aweme_id: string;
  aweme_type: number;
  cha_list: ChallengeInfo[] | null;
  challenge_position: null;
  cmt_swt: boolean;
  collect_stat: number;
  comment_config: CommentConfig;
  comment_topbar_info: null;
  commerce_config_data: null;
  commerce_info: CommerceInfo;
  content_desc: string;
  content_desc_extra: ContentDescExtra[];
  content_type: string;
  create_time: number;
  desc: string;
  desc_language: string;
  distance: string;
  distribute_type: number;
  duration: number;
  geofencing: any[];
  group_id: string;
  hybrid_label: null;
  image_infos: null;
  interact_permission: InteractPermission;
  is_ads: boolean;
  is_hash_tag: number;
  is_pgcshow: boolean;
  is_relieve: boolean;
  is_top: number;
  is_vr: boolean;
  item_comment_settings: number;
  item_duet: number;
  item_react: number;
  item_stitch: number;
  music: MusicInfo;
  music_begin_time_in_ms: number;
  music_end_time_in_ms: number;
  music_selected_from: string;
  music_title_style: number;
  music_volume: string;
  nickname_position: null;
  origin_comment_ids: null;
  origin_volume: string;
  original_client_text: {
    markup_text: string;
    text_extra: TextExtra[];
  };
  picked_users: any[];
  playlist_blocked: boolean;
  position: null;
  prevent_download: boolean;
  products_info: null;
  region: string;
  risk_infos: RiskInfo;
  share_info: ShareInfo;
  share_url: string;
  statistics: Statistics;
  status: ItemStatus;
  text_extra: TextExtra[];
  video: Video;
  video_control: VideoControl;
  video_labels: any[];
  video_text: any[];
  voice_filter_ids: null;
  with_promotional_music: boolean;
  without_watermark: boolean;
}

interface MusicInfo {
  album: string;
  artists: Artist[];
  audition_duration: number;
  author: string;
  author_deleted: boolean;
  author_position: null;
  avatar_large: ImageAsset;
  avatar_medium: ImageAsset;
  avatar_thumb: ImageAsset;
  binded_challenge_id: number;
  can_not_reuse: boolean;
  collect_stat: number;
  commercial_right_type: number;
  cover_hd: ImageAsset;
  cover_large: ImageAsset;
  cover_medium: ImageAsset;
  cover_thumb: ImageAsset;
  duration: number;
  duration_high_precision: {
    audition_duration_precision: number;
    duration_precision: number;
    shoot_duration_precision: number;
    video_duration_precision: number;
  };
  end_time: number;
  external_song_info: any[];
  extra: string;
  id: number;
  id_str: string;
  is_audio_url_with_cookie: boolean;
  is_author_artist: boolean;
  is_commerce_music: boolean;
  is_del_video: boolean;
  is_matched_metadata: boolean;
  is_original: boolean;
  is_original_sound: boolean;
  is_pgc: boolean;
  is_play_music: boolean;
  is_restricted: boolean;
  is_video_self_see: boolean;
  language: string;
  log_extra: string;
  matched_pgc_sound?: {
    artist_infos: null;
    author: string;
    mixed_author: string;
    mixed_title: string;
    music_release_info: {
      group_release_date: number;
      is_new_release_song: boolean;
    };
    title: string;
    uncert_artists: null;
  };
  matched_song: {
    author: string;
    chorus_info?: {
      duration_ms: number;
      start_ms: number;
    };
    cover_medium: ImageAsset;
    full_duration: number;
    h5_url: string;
    id: string;
    performers: null;
    title: string;
  };
  meme_song_info: Record<string, any>;
  mid: string;
  music_release_info?: {
    group_release_date: number;
    is_new_release_song: boolean;
  };
  mute_share: boolean;
  offline_desc: string;
  owner_handle: string;
  owner_nickname: string;
  play_url: ImageAsset;
  prevent_download: boolean;
  preview_end_time: number;
  preview_start_time: number;
  reason_type: number;
  redirect: boolean;
  schema_url: string;
  shoot_duration: number;
  source_platform: number;
  start_time: number;
  status: number;
  strong_beat_url: ImageAsset;
  tag_list: null;
  title: string;
  user_count: number;
  video_duration: number;
}

interface Artist {
  avatar: ImageAsset;
  enter_type: number;
  follow_status: number;
  follower_status: number;
  handle: string;
  is_block: boolean;
  is_blocked: boolean;
  is_private_account: boolean;
  is_verified: boolean;
  is_visible: boolean;
  nick_name: string;
  sec_uid: string;
  status: number;
  uid: string;
}

interface Author {
  accept_private_policy: boolean;
  account_labels: null;
  account_region: string;
  ad_cover_url: null;
  advance_feature_item_order: null;
  advanced_feature_info: null;
  apple_account: number;
  authority_status: number;
  avatar_168x168: ImageAsset;
  avatar_300x300: ImageAsset;
  avatar_larger: ImageAsset;
  avatar_medium: ImageAsset;
  avatar_thumb: ImageAsset;
  avatar_uri: string;
  aweme_count: number;
  bind_phone: string;
  birthday: string;
  bold_fields: null;
  can_message_follow_status_list: null;
  can_set_geofencing: null;
  cha_list: null;
  comment_filter_status: number;
  comment_setting: number;
  commerce_user_level: number;
  cover_url: ImageAsset[];
  create_time: number;
  custom_verify: string;
  cv_level: string;
  download_prompt_ts: number;
  download_setting: number;
  duet_setting: number;
  enterprise_verify_reason: string;
  events: null;
  favoriting_count: number;
  fb_expire_time: number;
  follow_status: number;
  follower_count: number;
  follower_status: number;
  following_count: number;
  gender: number;
  geofencing: any[];
  google_account: string;
  has_email: boolean;
  has_facebook_token: boolean;
  has_insights: boolean;
  has_orders: boolean;
  has_twitter_token: boolean;
  has_youtube_token: boolean;
  hide_search: boolean;
  homepage_bottom_toast: null;
  ins_id: string;
  is_ad_fake: boolean;
  is_block: boolean;
  is_discipline_member: boolean;
  is_phone_binded: boolean;
  is_star: boolean;
  language: string;
  live_agreement: number;
  live_commerce: boolean;
  live_verify: number;
  mutual_relation_avatars: null;
  need_recommend: number;
  nickname: string;
  platform_sync_info: null;
  prevent_download: boolean;
  react_setting: number;
  reflow_page_gid: number;
  reflow_page_uid: number;
  region: string;
  relative_users: null;
  room_id: number;
  sec_uid: string;
  secret: number;
  share_info: UserShareInfo;
  shield_comment_notice: number;
  shield_digg_notice: number;
  shield_follow_notice: number;
  short_id: string;
  signature: string;
  special_lock: number;
  status: number;
  stitch_setting: number;
  total_favorited: number;
  tw_expire_time: number;
  twitter_id: string;
  type_label: null;
  uid: string;
  unique_id: string;
  unique_id_modify_time: number;
  user_canceled: boolean;
  user_mode: number;
  user_period: number;
  user_rate: number;
  user_tags: null;
  verification_type: number;
  verify_info: string;
  video_icon: ImageAsset;
  white_cover_url: null;
  with_commerce_entry: boolean;
  with_fusion_shop_entry: boolean;
  with_shop_entry: boolean;
  youtube_channel_id: string;
  youtube_expire_time: number;
}

interface Video {
  bit_rate: BitRate[];
  bit_rate_audio: any[];
  cdn_url_expired: number;
  cover: ImageAsset;
  download_addr: VideoAddress;
  duration: number;
  dynamic_cover: ImageAsset;
  has_watermark: boolean;
  height: number;
  is_bytevc1: number;
  is_callback: boolean;
  is_h265: number;
  meta: string;
  need_set_token: boolean;
  origin_cover: ImageAsset;
  play_addr: VideoAddress;
  play_addr_265: VideoAddress;
  play_addr_h264: VideoAddress;
  ratio: string;
  source_HDR_type: number;
  tags: null;
  width: number;
}

interface BitRate {
  HDR_bit: string;
  HDR_type: string;
  bit_rate: number;
  dub_infos: null;
  fps: number;
  gear_name: string;
  is_bytevc1: number;
  is_h265: number;
  play_addr: VideoAddress;
  quality_type: number;
  video_extra: string;
}

interface VideoAddress {
  data_size: number;
  file_cs: string;
  file_hash: string;
  height: number;
  uri: string;
  url_key?: string;
  url_list: string[];
  url_prefix: null;
  width: number;
}

interface ImageAsset {
  height: number;
  width: number;
  uri: string;
  url_list: string[];
  url_prefix: null;
}

interface VideoControl {
  allow_download: boolean;
  allow_duet: boolean;
  allow_dynamic_wallpaper: boolean;
  allow_music: boolean;
  allow_react: boolean;
  allow_stitch: boolean;
  draft_progress_bar: number;
  prevent_download_type: number;
  share_type: number;
  show_progress_bar: number;
  timer_status: number;
}

interface CommentConfig {
  emoji_recommend_list: null;
  long_press_recommend_list: null;
  preload: {
    preds: string;
  };
  quick_comment: {
    enabled: boolean;
  };
  quick_comment_emoji_recommend_list: null;
}

interface CommerceInfo {
  adv_promotable: boolean;
  auction_ad_invited: boolean;
  branded_content_type: number;
  with_comment_filter_words: boolean;
}

interface ContentDescExtra {
  end: number;
  hashtag_id: string;
  hashtag_name: string;
  is_commerce: boolean;
  start: number;
  type: number;
}

interface InteractPermission {
  allow_adding_to_story: number;
  duet: number;
  duet_privacy_setting: number;
  stitch: number;
  stitch_privacy_setting: number;
  upvote: number;
}

interface RiskInfo {
  content: string;
  risk_sink: boolean;
  type: number;
  vote: boolean;
  warn: boolean;
}

interface ShareInfo {
  bool_persist: number;
  share_desc: string;
  share_link_desc: string;
  share_quote: string;
  share_signature_desc: string;
  share_signature_url: string;
  share_title: string;
  share_title_myself: string;
  share_title_other: string;
  share_url: string;
  share_weibo_desc: string;
}

interface UserShareInfo {
  share_desc: string;
  share_desc_info: string;
  share_qrcode_url: ImageAsset;
  share_title: string;
  share_title_myself: string;
  share_title_other: string;
  share_url: string;
  share_weibo_desc: string;
}

interface Statistics {
  aweme_id: string;
  collect_count: number;
  comment_count: number;
  digg_count: number;
  download_count: number;
  forward_count: number;
  lose_comment_count: number;
  lose_count: number;
  play_count: number;
  share_count: number;
  whatsapp_share_count: number;
}

interface ItemStatus {
  allow_comment: boolean;
  allow_share: boolean;
  aweme_id: string;
  download_status: number;
  in_reviewing: boolean;
  is_delete: boolean;
  is_prohibited: boolean;
  private_status: number;
  review_result: {
    review_status: number;
  };
  reviewed: number;
  self_see: boolean;
  with_goods: boolean;
}

interface TextExtra {
  end: number;
  hashtag_id: string;
  hashtag_name: string;
  is_commerce: boolean;
  sec_uid: string;
  start: number;
  type: number;
  user_id: string;
}

interface ChallengeInfo {
  author: ChallengeAuthor;
  banner_list: null;
  cha_attrs: null;
  cha_name: string;
  cid: string;
  collect_stat: number;
  connect_music: any[];
  desc: string;
  extra_attr: {
    is_live: boolean;
  };
  hashtag_profile: string;
  is_challenge: number;
  is_commerce: boolean;
  is_pgcshow: boolean;
  schema: string;
  search_highlight: null;
  share_info: ChallengeShareInfo;
  show_items: null;
  sub_type: number;
  type: number;
  use_count: number;
  user_count: number;
  view_count: number;
}

interface ChallengeAuthor {
  account_labels: null;
  ad_cover_url: null;
  advance_feature_item_order: null;
  advanced_feature_info: null;
  bold_fields: null;
  can_message_follow_status_list: null;
  can_set_geofencing: null;
  cha_list: null;
  cover_url: null;
  events: null;
  followers_detail: null;
  geofencing: null;
  homepage_bottom_toast: null;
  item_list: null;
  mutual_relation_avatars: null;
  need_points: null;
  platform_sync_info: null;
  relative_users: null;
  search_highlight: null;
  shield_edit_field_info: null;
  type_label: null;
  user_profile_guide: null;
  user_tags: null;
  white_cover_url: null;
}

interface ChallengeShareInfo {
  bool_persist: number;
  now_invitation_card_image_urls: null;
  share_desc: string;
  share_desc_info: string;
  share_quote: string;
  share_signature_desc: string;
  share_signature_url: string;
  share_title: string;
  share_title_myself: string;
  share_title_other: string;
  share_url: string;
  share_weibo_desc: string;
}
