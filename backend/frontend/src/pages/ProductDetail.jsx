import React, { useState } from 'react';
import { Star, Check, ChevronDown, ShoppingBag, Menu, Search, User } from 'lucide-react';

const ProductDetail = () => {
    const [isSubscribe, setIsSubscribe] = useState(true);

    return (
        <div className="font-sans text-gray-900 bg-white">
            {/* Navigation */}
            <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-50">
                <div className="flex items-center space-x-6">
                    <Menu className="w-6 h-6 text-gray-700 lg:hidden" />
                    <div className="text-2xl font-serif font-bold tracking-tight">NUTRAFOL</div>
                    <div className="hidden lg:flex space-x-8 text-sm font-medium tracking-wide text-gray-600">
                        <a href="#" className="hover:text-black">Women</a>
                        <a href="#" className="hover:text-black">Men</a>
                        <a href="#" className="hover:text-black">Scalp Care</a>
                        <a href="#" className="hover:text-black">Skin</a>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="hidden lg:block text-sm font-medium text-gray-600">Take the Quiz</div>
                    <Search className="w-5 h-5 text-gray-700" />
                    <User className="w-5 h-5 text-gray-700" />
                    <ShoppingBag className="w-5 h-5 text-gray-700" />
                </div>
            </nav>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
                    {/* Image Gallery (Left) */}
                    <div className="space-y-4">
                        <div className="aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                                src="https://images.unsplash.com/photo-1555685812-4b943f3e9942?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                                alt="Product Bottle"
                                className="w-full h-full object-center object-cover"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-w-1 aspect-h-1 bg-gray-100 rounded-lg overflow-hidden">
                                    <div className="w-full h-full bg-gray-200"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Product Info (Right) */}
                    <div className="mt-10 lg:mt-0">
                        <div className="flex items-center space-x-2 mb-4">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold uppercase tracking-wider rounded">Best Seller</span>
                            <div className="flex items-center text-yellow-500">
                                <Star className="w-4 h-4 fill-current" />
                                <Star className="w-4 h-4 fill-current" />
                                <Star className="w-4 h-4 fill-current" />
                                <Star className="w-4 h-4 fill-current" />
                                <Star className="w-4 h-4 fill-current" />
                                <span className="ml-2 text-sm text-gray-500 font-medium underline">3,492 Reviews</span>
                            </div>
                        </div>

                        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Women's Balance</h1>
                        <p className="text-lg text-gray-600 mb-6">Physician-formulated for women before, during, and after menopause.</p>

                        {/* Pricing / Subscription Toggle */}
                        <div className="border border-gray-200 rounded-lg p-4 mb-8">
                            <div
                                className={`flex items-center justify-between cursor-pointer p-3 rounded-md transition-all ${isSubscribe ? 'bg-gray-50 border border-gray-300' : ''}`}
                                onClick={() => setIsSubscribe(true)}
                            >
                                <div className="flex items-center">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${isSubscribe ? 'border-black bg-black' : 'border-gray-300'}`}>
                                        {isSubscribe && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div>
                                        <span className="block font-bold text-gray-900">Subscribe & Save</span>
                                        <span className="text-sm text-gray-500">Delivery every month</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-lg">$79.00</span>
                                    <span className="text-sm text-gray-400 line-through">$88.00</span>
                                </div>
                            </div>

                            <div
                                className={`flex items-center justify-between cursor-pointer p-3 rounded-md mt-2 transition-all ${!isSubscribe ? 'bg-gray-50 border border-gray-300' : ''}`}
                                onClick={() => setIsSubscribe(false)}
                            >
                                <div className="flex items-center">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${!isSubscribe ? 'border-black bg-black' : 'border-gray-300'}`}>
                                        {!isSubscribe && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className="block font-bold text-gray-900">One-time Purchase</span>
                                </div>
                                <span className="block font-bold text-lg">$88.00</span>
                            </div>
                        </div>

                        <button className="w-full bg-gray-900 text-white font-bold py-4 px-8 rounded hover:bg-gray-800 transition-colors uppercase tracking-widest text-sm mb-4">
                            Add to Cart
                        </button>
                        <p className="text-center text-xs text-gray-500 mb-8">Free shipping in the US. Pause or cancel anytime.</p>

                        {/* Benefits */}
                        <div className="border-t border-gray-200 pt-8">
                            <h3 className="font-bold text-lg mb-4">The Benefits</h3>
                            <ul className="space-y-3">
                                <li className="flex items-start">
                                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                                    <span className="text-gray-600">Visibly thicker volume and less shedding.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                                    <span className="text-gray-600">Improves hair growth and coverage.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                                    <span className="text-gray-600">Supports hormone health and sleep.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
