import { NotificationDTO, DirectMessageDTO, CommunityWishlistRequestDTO } from '../../types';

const INITIAL_NOTIFICATIONS: NotificationDTO[] = [
  {
    id: 'notif_1',
    recipientUserId: 'U101', // Sarah Jenkins
    senderUserId: 'U103', // Priya Sharma
    senderName: 'Priya Sharma',
    title: 'Item Borrowed: DeWalt Circular Saw',
    message: 'Priya Sharma borrowed your DeWalt Circular Saw. Requested pickup: "Saturday morning before 10 AM".',
    type: 'BORROW_REQUEST',
    timestamp: '2026-09-17 09:30',
    read: false,
    itemId: 'I206',
    itemTitle: 'DeWalt Circular Saw',
    recordId: 'R301',
    pickupNote: 'Will be using it to trim shelving boards in my garage.',
    pickupSlot: 'Saturday morning before 10 AM'
  },
  {
    id: 'notif_2',
    recipientUserId: 'U101', // Sarah Jenkins
    senderUserId: 'U104', // David Miller
    senderName: 'David Miller',
    title: '5★ Community Trust Review',
    message: 'David Miller rated you 5.0★: "Great ladder! Clean, lightweight, and very easy communication."',
    type: 'RATING_RECEIVED',
    timestamp: '2026-09-15 14:10',
    read: true,
    itemId: 'I202',
    itemTitle: 'Little Giant Step Ladder'
  },
  {
    id: 'notif_3',
    recipientUserId: 'U103', // Priya Sharma
    title: 'Accountability Notice: Due Date Approaching',
    message: 'Your loan of DeWalt Circular Saw is due on 2026-09-20. Return promptly to avoid daily fine of $5.00/day.',
    type: 'DUE_SOON',
    timestamp: '2026-09-19 08:00',
    read: false,
    itemId: 'I206',
    itemTitle: 'DeWalt Circular Saw',
    recordId: 'R301'
  }
];

const INITIAL_MESSAGES: DirectMessageDTO[] = [
  {
    id: 'msg_1',
    conversationId: 'R301',
    senderId: 'U103',
    senderName: 'Priya Sharma',
    recipientId: 'U101',
    text: 'Hi Sarah! I am on my way to pick up the circular saw. Is your porch door unlocked?',
    timestamp: '2026-09-17 09:35'
  },
  {
    id: 'msg_2',
    conversationId: 'R301',
    senderId: 'U101',
    senderName: 'Sarah Jenkins',
    recipientId: 'U103',
    text: 'Hi Priya! Yes, I placed it in the plastic tote beside the garden hose. Protective glasses are inside too!',
    timestamp: '2026-09-17 09:38'
  }
];

const INITIAL_COMMUNITY_WISHLIST: CommunityWishlistRequestDTO[] = [
  {
    id: 'wish_1',
    requesterId: 'U104',
    requesterName: 'David Miller',
    locality: 'Riverside Green',
    title: 'Carpet Cleaner / Shampooer',
    category: 'Tool',
    neededDate: 'Next Weekend',
    note: 'Hosting family next week, need to deep clean living room rugs for 1 day.',
    status: 'OPEN'
  },
  {
    id: 'wish_2',
    requesterId: 'U102',
    requesterName: 'Michael Chen',
    locality: 'Oakridge District',
    title: 'Foldable Camping Chairs (Set of 4)',
    category: 'Tool',
    neededDate: 'Friday Evening',
    note: 'For neighborhood block movie night.',
    status: 'OPEN'
  }
];

export class NotificationService {
  private static instance: NotificationService;
  private notifications: NotificationDTO[] = [];
  private messages: DirectMessageDTO[] = [];
  private wishlistRequests: CommunityWishlistRequestDTO[] = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private loadFromStorage(): void {
    try {
      const storedNotifs = localStorage.getItem('crsn_notifications');
      if (storedNotifs) {
        this.notifications = JSON.parse(storedNotifs);
      } else {
        this.notifications = [...INITIAL_NOTIFICATIONS];
        this.saveNotifications();
      }

      const storedMsgs = localStorage.getItem('crsn_direct_messages');
      if (storedMsgs) {
        this.messages = JSON.parse(storedMsgs);
      } else {
        this.messages = [...INITIAL_MESSAGES];
        this.saveMessages();
      }

      const storedWishlist = localStorage.getItem('crsn_community_wishlist');
      if (storedWishlist) {
        this.wishlistRequests = JSON.parse(storedWishlist);
      } else {
        this.wishlistRequests = [...INITIAL_COMMUNITY_WISHLIST];
        this.saveWishlist();
      }
    } catch (e) {
      console.warn('Error loading notifications or messages', e);
      this.notifications = [...INITIAL_NOTIFICATIONS];
      this.messages = [...INITIAL_MESSAGES];
      this.wishlistRequests = [...INITIAL_COMMUNITY_WISHLIST];
    }
  }

  private saveNotifications(): void {
    localStorage.setItem('crsn_notifications', JSON.stringify(this.notifications));
  }

  private saveMessages(): void {
    localStorage.setItem('crsn_direct_messages', JSON.stringify(this.messages));
  }

  private saveWishlist(): void {
    localStorage.setItem('crsn_community_wishlist', JSON.stringify(this.wishlistRequests));
  }

  public getNotificationsForUser(userId: string): NotificationDTO[] {
    return this.notifications
      .filter(n => n.recipientUserId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getUnreadCount(userId: string): number {
    return this.notifications.filter(n => n.recipientUserId === userId && !n.read).length;
  }

  public markAsRead(notificationId: string): void {
    const notif = this.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      this.saveNotifications();
    }
  }

  public markAllAsRead(userId: string): void {
    this.notifications.forEach(n => {
      if (n.recipientUserId === userId) {
        n.read = true;
      }
    });
    this.saveNotifications();
  }

  public deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
  }

  public sendNotification(
    recipientUserId: string,
    title: string,
    message: string,
    type: NotificationDTO['type'],
    meta: Partial<NotificationDTO> = {}
  ): NotificationDTO {
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;
    const newNotif: NotificationDTO = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientUserId,
      title,
      message,
      type,
      timestamp,
      read: false,
      ...meta
    };
    this.notifications.unshift(newNotif);
    this.saveNotifications();
    return newNotif;
  }

  // Messaging
  public getMessagesForConversation(conversationId: string): DirectMessageDTO[] {
    return this.messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    recipientId: string,
    text: string
  ): DirectMessageDTO {
    const now = new Date();
    const timestamp = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;
    const msg: DirectMessageDTO = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId,
      senderName,
      recipientId,
      text,
      timestamp
    };
    this.messages.push(msg);
    this.saveMessages();

    // Send notification to recipient
    this.sendNotification(
      recipientId,
      `New Message from ${senderName}`,
      text.length > 60 ? text.substring(0, 57) + '...' : text,
      'CHAT_MESSAGE',
      {
        senderUserId: senderId,
        senderName,
        recordId: conversationId
      }
    );

    return msg;
  }

  // Community Wishlist
  public getWishlistRequests(): CommunityWishlistRequestDTO[] {
    return [...this.wishlistRequests];
  }

  public addWishlistRequest(
    requesterId: string,
    requesterName: string,
    locality: string,
    title: string,
    category: any,
    neededDate: string,
    note: string
  ): CommunityWishlistRequestDTO {
    const req: CommunityWishlistRequestDTO = {
      id: `wish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      requesterId,
      requesterName,
      locality,
      title,
      category,
      neededDate,
      note,
      status: 'OPEN'
    };
    this.wishlistRequests.unshift(req);
    this.saveWishlist();
    return req;
  }

  public fulfillWishlistRequest(requestId: string): void {
    const item = this.wishlistRequests.find(w => w.id === requestId);
    if (item) {
      item.status = 'OFFERED';
      this.saveWishlist();
    }
  }

  public clearAll(): void {
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.messages = [...INITIAL_MESSAGES];
    this.wishlistRequests = [...INITIAL_COMMUNITY_WISHLIST];
    this.saveNotifications();
    this.saveMessages();
    this.saveWishlist();
  }
}
