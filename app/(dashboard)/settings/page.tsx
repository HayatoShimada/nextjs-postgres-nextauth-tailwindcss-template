'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Store } from '@/lib/db';
import Image from 'next/image';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddStore, setShowAddStore] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch('/api/stores');
        if (!response.ok) throw new Error('Failed to fetch stores');
        const data = await response.json();
        setStores(data);
      } catch (error) {
        console.error('Error fetching stores:', error);
        setMessage({
          type: 'error',
          text: '店舗一覧の取得に失敗しました'
        });
      }
    };
    fetchStores();
  }, []);

  const handleStoreChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const storeId = parseInt(e.target.value);
    setSelectedStore(storeId);
    
    if (session?.user?.id) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/store', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ storeId }),
        });

        if (!response.ok) throw new Error('Failed to update store');

        setMessage({
          type: 'success',
          text: '店舗を更新しました'
        });
      } catch (error) {
        console.error('Error updating store:', error);
        setMessage({
          type: 'error',
          text: '店舗の更新に失敗しました'
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStore),
      });

      if (!response.ok) throw new Error('Failed to create store');

      const store = await response.json();
      setStores([...stores, store]);
      setShowAddStore(false);
      setNewStore({
        name: '',
        address: '',
        phone: '',
        email: ''
      });
      setMessage({
        type: 'success',
        text: '店舗を追加しました'
      });
    } catch (error) {
      console.error('Error creating store:', error);
      setMessage({
        type: 'error',
        text: '店舗の追加に失敗しました'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">アカウント設定</h2>
      </div>
      
      <div className="grid gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">ユーザー情報</h2>
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative w-16 h-16">
              <Image
                src={session?.user?.image || '/placeholder-user.jpg'}
                alt="プロフィール画像"
                fill
                className="rounded-full object-cover"
              />
            </div>
            <div>
              <p className="font-medium">{session?.user?.name}</p>
              <p className="text-gray-600">{session?.user?.email}</p>
              {session?.user?.id && (
                <p className="text-sm text-gray-500 mt-1">
                  ユーザーID: {session.user.id}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">店舗設定</h2>
            <button
              onClick={() => setShowAddStore(!showAddStore)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {showAddStore ? 'キャンセル' : '新規店舗追加'}
            </button>
          </div>

          {showAddStore && (
            <form onSubmit={handleAddStore} className="mb-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  店舗名
                </label>
                <input
                  type="text"
                  id="name"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  住所
                </label>
                <input
                  type="text"
                  id="address"
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={newStore.phone}
                  onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  value={newStore.email}
                  onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {isLoading ? '追加中...' : '店舗を追加'}
              </button>
            </form>
          )}

          <div className="mb-4">
            <label htmlFor="store" className="block text-sm font-medium text-gray-700 mb-2">
              所属店舗
            </label>
            <select
              id="store"
              value={selectedStore || ''}
              onChange={handleStoreChange}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">店舗を選択してください</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          {message && (
            <div
              className={`p-4 rounded-md ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 