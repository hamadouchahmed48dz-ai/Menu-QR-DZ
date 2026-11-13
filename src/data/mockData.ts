import { Restaurant, Category, Product, RestaurantTable, Order, Offer } from '../types';

export const INITIAL_RESTAURANT: Restaurant = {
  id: 'rest_younes_01',
  name: 'Younes Restaurant',
  tagline: {
    en: 'Artisan Wood-Fired & Gourmet Grill',
    fr: 'Four à bois artisanal & Grillades gourmandes',
    ar: 'مأكولات فاخرة، مشاوي وبيتزا الحطب التقليدية',
  },
  logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=120&h=120&q=80',
  coverImage: '/src/assets/images/restaurant_cover_interior_1793918997325.jpg',
  isOpen: true,
  openingHours: '11:30 - 23:30',
  phone: '+213 (0) 550 12 34 56',
  address: 'Didouche Mourad, Alger Centre, Algeria',
  currency: 'DZD',
  currencySymbol: {
    en: 'DA',
    fr: 'DA',
    ar: 'د.ج',
  },
};

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat_pizza',
    name: {
      en: 'Pizza',
      fr: 'Pizzas',
      ar: 'بيتزا',
    },
    icon: 'Pizza',
    order: 1,
  },
  {
    id: 'cat_burgers',
    name: {
      en: 'Burgers',
      fr: 'Burgers',
      ar: 'برغر',
    },
    icon: 'Sandwich',
    order: 2,
  },
  {
    id: 'cat_tacos',
    name: {
      en: 'Tacos',
      fr: 'Tacos',
      ar: 'تاكوس',
    },
    icon: 'UtensilsCrossed',
    order: 3,
  },
  {
    id: 'cat_chicken',
    name: {
      en: 'Chicken',
      fr: 'Poulet',
      ar: 'دجاج',
    },
    icon: 'Drumstick',
    order: 4,
  },
  {
    id: 'cat_desserts',
    name: {
      en: 'Desserts',
      fr: 'Desserts',
      ar: 'حلويات',
    },
    icon: 'IceCream',
    order: 5,
  },
  {
    id: 'cat_drinks',
    name: {
      en: 'Drinks',
      fr: 'Boissons',
      ar: 'مشروبات',
    },
    icon: 'CupSoda',
    order: 6,
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Pizzas
  {
    id: 'prod_pizza_margherita',
    categoryId: 'cat_pizza',
    name: {
      en: 'Pizza Margherita',
      fr: 'Pizza Margherita',
      ar: 'بيتزا مارغريتا',
    },
    description: {
      en: 'San Marzano tomato sauce, fior di latte mozzarella, fresh basil, kalamata olives, extra virgin olive oil.',
      fr: 'Sauce tomate San Marzano, mozzarella fior di latte, basilic frais, olives kalamata, huile d’olive extra vierge.',
      ar: 'صلصة طماطم سان مارزانو، جبنة موزاريلا طازجة، ريحان أخضر، زيتون كالاماتا وزيت زيتون بكر.',
    },
    price: 650,
    image: '/src/assets/images/dish_pizza_margherita_1793918998408.jpg',
    isPopular: true,
    isVegetarian: true,
    isAvailable: true,
    sizes: [
      { id: 'size_reg', name: { en: 'Medium (30cm)', fr: 'Moyenne (30cm)', ar: 'متوسط (30 سم)' }, priceOffset: 0 },
      { id: 'size_large', name: { en: 'Large (36cm)', fr: 'Grande (36cm)', ar: 'كبير (36 سم)' }, priceOffset: 300 },
    ],
    extras: [
      { id: 'ext_cheese', name: { en: 'Double Mozzarella', fr: 'Double Mozzarella', ar: 'موزاريلا مضاعفة' }, price: 150 },
      { id: 'ext_mushrooms', name: { en: 'Fresh Mushrooms', fr: 'Champignons frais', ar: 'فطر طازج' }, price: 100 },
      { id: 'ext_truffle', name: { en: 'Truffle Oil Drizzle', fr: 'Huile de truffe', ar: 'زيت الكمأة الفاخر' }, price: 180 },
    ],
    preparationTimeMinutes: 14,
  },
  {
    id: 'prod_pizza_4cheese',
    categoryId: 'cat_pizza',
    name: {
      en: 'Pizza 4 Fromages Gourmet',
      fr: 'Pizza 4 Fromages Gourmet',
      ar: 'بيتزا 4 أجبان غورميه',
    },
    description: {
      en: 'Cheddar aged, gorgonzola dop, mozzarella di bufala, parmigiano reggiano, crushed walnuts & honey drizzle.',
      fr: 'Cheddar affiné, gorgonzola dop, mozzarella di bufala, parmigiano reggiano, noix concassées et filet de miel.',
      ar: 'مزيج فاخر من 4 أجبان معتقة: شيدر، غورغونزولا، موزاريلا، بارميزان مع جوز مقرمش ورشة عسل.',
    },
    price: 950,
    image: '/src/assets/images/dish_pizza_margherita_1793918998408.jpg',
    isPopular: true,
    isVegetarian: true,
    isAvailable: true,
    sizes: [
      { id: 'size_reg', name: { en: 'Medium (30cm)', fr: 'Moyenne (30cm)', ar: 'متوسط (30 سم)' }, priceOffset: 0 },
      { id: 'size_large', name: { en: 'Large (36cm)', fr: 'Grande (36cm)', ar: 'كبير (36 سم)' }, priceOffset: 350 },
    ],
    extras: [
      { id: 'ext_cheese', name: { en: 'Extra Gorgonzola', fr: 'Supplément Gorgonzola', ar: 'غورغونزولا إضافية' }, price: 180 },
      { id: 'ext_honey', name: { en: 'Extra Honey Pot', fr: 'Pot de miel pur', ar: 'عسل نقي إضافي' }, price: 80 },
    ],
    preparationTimeMinutes: 15,
  },
  {
    id: 'prod_pizza_fumee',
    categoryId: 'cat_pizza',
    name: {
      en: 'Pizza Poulet Fumé & BBQ',
      fr: 'Pizza Poulet Fumé & BBQ',
      ar: 'بيتزا دجاج مدخن و باربيكيو',
    },
    description: {
      en: 'Smoked marinated chicken breast, sweet BBQ sauce, caramelized onions, mozzarella, bell peppers.',
      fr: 'Blancs de poulet mariné fumé, sauce BBQ douce, oignons caramélisés, mozzarella, poivrons croquants.',
      ar: 'صدور دجاج مدخنة متبلة، صوص باربيكيو لذيذ، بصل مكرمل، موزاريلا، وفلفل رومي ملون.',
    },
    price: 850,
    image: '/src/assets/images/dish_pizza_margherita_1793918998408.jpg',
    isNew: true,
    isAvailable: true,
    sizes: [
      { id: 'size_reg', name: { en: 'Medium (30cm)', fr: 'Moyenne (30cm)', ar: 'متوسط (30 سم)' }, priceOffset: 0 },
      { id: 'size_large', name: { en: 'Large (36cm)', fr: 'Grande (36cm)', ar: 'كبير (36 سم)' }, priceOffset: 300 },
    ],
    extras: [
      { id: 'ext_cheese', name: { en: 'Cheddar sauce', fr: 'Coulis Cheddar', ar: 'صوص شيدر ذائب' }, price: 120 },
      { id: 'ext_jalapeno', name: { en: 'Spicy Jalapeños', fr: 'Piments Jalapeños', ar: 'فلفل هالبينو حار' }, price: 90 },
    ],
    preparationTimeMinutes: 16,
  },

  // Burgers
  {
    id: 'prod_burger_smash',
    categoryId: 'cat_burgers',
    name: {
      en: 'Double Smash Beef Burger',
      fr: 'Double Smash Burger Gourmand',
      ar: 'دبل سماش برغر لحم بقري',
    },
    description: {
      en: 'Two 100% fresh beef patties smashed thin, double melted cheddar, grilled onions, house secret sauce, buttery toasted brioche.',
      fr: 'Deux steaks 100% pur bœuf frais smashés, double cheddar fondu, oignons caramélisés, sauce secrète maison, pain brioché beurré.',
      ar: 'شريحتان من لحم البقر الطازج 100%، دبل جبن شيدر ذائب، بصل مكرمل مشوي، صوص سري خاص وخبز بريوش محمص بالزبدة.',
    },
    price: 850,
    image: '/src/assets/images/dish_gourmet_burger_1793918999411.jpg',
    isPopular: true,
    isAvailable: true,
    sizes: [
      { id: 'size_double', name: { en: 'Double Patty (180g)', fr: 'Double Steak (180g)', ar: 'دبل شريحة (180غ)' }, priceOffset: 0 },
      { id: 'size_triple', name: { en: 'Triple Monster (270g)', fr: 'Triple Monster (270g)', ar: 'تريبل مونستر (270غ)' }, priceOffset: 280 },
    ],
    extras: [
      { id: 'ext_bacon', name: { en: 'Smoked Beef Bacon', fr: 'Bacon de bœuf fumé', ar: 'بيكون بقري مدخن' }, price: 150 },
      { id: 'ext_egg', name: { en: 'Fried Farm Egg', fr: 'Œuf au plat', ar: 'بيض عيون طازج' }, price: 80 },
      { id: 'ext_jalapeno', name: { en: 'Pickled Jalapeños', fr: 'Jalapeños marinés', ar: 'هالبينو مخلل حار' }, price: 90 },
    ],
    preparationTimeMinutes: 12,
  },
  {
    id: 'prod_burger_chicken_crisp',
    categoryId: 'cat_burgers',
    name: {
      en: 'Crispy Nashville Chicken Burger',
      fr: 'Crispy Nashville Chicken Burger',
      ar: 'برغر دجاج كرسبي ناشفيل',
    },
    description: {
      en: 'Buttermilk-brined crispy chicken breast, spicy honey glaze, fresh creamy coleslaw, dill pickles, brioche bun.',
      fr: 'Filet de poulet mariné au babeurre pané extra croustillant, glaçage miel piquant, coleslaw crémeux, pickles d’aneth.',
      ar: 'صدر دجاج مقرمش متبل بالحليب الرائب، لمسة عسل حار، سلطة كولسلو كريمية، مخلل خيار وخبز بريوش.',
    },
    price: 750,
    image: '/src/assets/images/dish_gourmet_burger_1793918999411.jpg',
    isSpicy: true,
    isAvailable: true,
    sizes: [
      { id: 'size_single', name: { en: 'Standard Burger', fr: 'Burger Simple', ar: 'حجم عادي' }, priceOffset: 0 },
      { id: 'size_menu', name: { en: 'Meal (Fries + Drink)', fr: 'Menu (Frites + Boisson)', ar: 'وجبة كاملة (بطاطا + مشروب)' }, priceOffset: 250 },
    ],
    extras: [
      { id: 'ext_cheese', name: { en: 'Cheddar Slice', fr: 'Tranche de Cheddar', ar: 'شريحة شيدر' }, price: 100 },
      { id: 'ext_sauce', name: { en: 'Extra Garlic Mayo Dip', fr: 'Sauce Mayonnaise Ail', ar: 'مايونيز بالثوم إضافي' }, price: 70 },
    ],
    preparationTimeMinutes: 12,
  },

  // Tacos
  {
    id: 'prod_tacos_supreme',
    categoryId: 'cat_tacos',
    name: {
      en: 'French Tacos Suprême XL',
      fr: 'Tacos Français Suprême XL',
      ar: 'تاكوس فرنسي سوبريم إكس إل',
    },
    description: {
      en: 'Toasted tortilla packed with minced beef, crispy chicken nuggets, golden fries, and our signature hot Gruyère cheese sauce.',
      fr: 'Galette toastée garnie de viande hachée, nuggets de poulet croustillants, frites dorées et sauce fromagère maison onctueuse au Gruyère.',
      ar: 'خبز التورتيلا المحمص المحشو باللحم المفروم، قطع الدجاج المقرمشة، بطاطس مقلية مع صوص الجبن الساخن الفاخر.',
    },
    price: 750,
    image: '/src/assets/images/dish_crispy_chicken_1793919000437.jpg',
    isPopular: true,
    isAvailable: true,
    sizes: [
      { id: 'size_l', name: { en: 'Large (2 Meats)', fr: 'Taille L (2 Viandes)', ar: 'حجم كبير (2 لحوم)' }, priceOffset: 0 },
      { id: 'size_xl', name: { en: 'Gigantor XL (3 Meats)', fr: 'Taille XL (3 Viandes)', ar: 'عملاق XL (3 لحوم)' }, priceOffset: 200 },
    ],
    extras: [
      { id: 'ext_boursin', name: { en: 'Boursin Garlic Cheese', fr: 'Fromage Boursin', ar: 'جبن بورسان بالأعشاب' }, price: 150 },
      { id: 'ext_sauce_algerienne', name: { en: 'Sauce Algérienne', fr: 'Sauce Algérienne piquante', ar: 'صلصة جزائرية حارة' }, price: 60 },
    ],
    preparationTimeMinutes: 15,
  },
  {
    id: 'prod_tacos_cordon_bleu',
    categoryId: 'cat_tacos',
    name: {
      en: 'Tacos Cordon Bleu & Merguez',
      fr: 'Tacos Cordon Bleu & Merguez',
      ar: 'تاكوس كوردون بلو ومرقاز',
    },
    description: {
      en: 'Crispy turkey cordon bleu cutlets, spicy artisanal merguez sausages, cheese sauce and crispy fries.',
      fr: 'Escalope cordon bleu panée, merguez artisanale grillée relevée, sauce fromagère coulante et frites croustillantes.',
      ar: 'كوردون بلو مقرمش، صوصج مرقاز تقليدي متبل، صوص أجبان فرنسي ذائب وبطاطا مقلية مقرمشة.',
    },
    price: 700,
    image: '/src/assets/images/dish_crispy_chicken_1793919000437.jpg',
    isSpicy: true,
    isAvailable: true,
    sizes: [
      { id: 'size_l', name: { en: 'Size L', fr: 'Taille L', ar: 'حجم كبير L' }, priceOffset: 0 },
      { id: 'size_xl', name: { en: 'Size XL', fr: 'Taille XL', ar: 'حجم عملاق XL' }, priceOffset: 180 },
    ],
    extras: [
      { id: 'ext_cheddar', name: { en: 'Melted Cheddar', fr: 'Cheddar Fondu', ar: 'شيدر ذائب' }, price: 120 },
    ],
    preparationTimeMinutes: 14,
  },

  // Chicken
  {
    id: 'prod_chicken_crispy_strips',
    categoryId: 'cat_chicken',
    name: {
      en: 'Crispy Golden Chicken Tenders (6 pcs)',
      fr: 'Tenders de Poulet Dorés Croustillants (6 pcs)',
      ar: 'قطع تندرز دجاج ذهبية مقرمشة (6 قطع)',
    },
    description: {
      en: 'Hand-breaded 100% tender chicken breast strips seasoned with 11 spices, served with garlic herb dip & lemon wedges.',
      fr: 'Aiguillettes de poulet 100% filet panées minute aux 11 épices secrètes, servies avec sauce crémeuse à l’ail et quartiers de citron.',
      ar: 'أصابع دجاج مقرمشة طازجة ومحضرة بخلطة 11 بهاراً، تقدم مع صوص الثوم والأعشاب وقطع الليمون الطازج.',
    },
    price: 650,
    image: '/src/assets/images/dish_crispy_chicken_1793919000437.jpg',
    isPopular: true,
    isAvailable: true,
    sizes: [
      { id: 'size_6pcs', name: { en: '6 Pieces Box', fr: 'Boîte 6 pièces', ar: 'علبة 6 قطع' }, priceOffset: 0 },
      { id: 'size_10pcs', name: { en: '10 Pieces Feast', fr: 'Boîte 10 pièces', ar: 'علبة عائلية 10 قطع' }, priceOffset: 320 },
    ],
    extras: [
      { id: 'ext_sweet_chili', name: { en: 'Sweet Chili Dip', fr: 'Sauce Sweet Chili', ar: 'صلصة فلفل حلو حار' }, price: 80 },
      { id: 'ext_fries_side', name: { en: 'Rustic Seasoned Fries', fr: 'Portion de frites maison', ar: 'طبق بطاطا مقلية' }, price: 150 },
    ],
    preparationTimeMinutes: 10,
  },
  {
    id: 'prod_chicken_roast_half',
    categoryId: 'cat_chicken',
    name: {
      en: 'Herbed Rotisserie Half Chicken',
      fr: 'Demi Poulet Rôti aux Herbes de Provence',
      ar: 'نصف دجاجة مشوية على الفحم بالأعشاب',
    },
    description: {
      en: 'Slow-roasted rotisserie chicken with crisp golden skin, rosemary, garlic butter baste, and roasted baby potatoes.',
      fr: 'Demi poulet fermier rôti lentement à la broche, peau croustillante dorée, beurre aillé au romarin et pommes de terre fondantes.',
      ar: 'نصف دجاجة طرية مشوية ببطء ومتبلة بإكليل الجبل وزبدة الثوم مع بطاطس صغيرة مشوية.',
    },
    price: 1100,
    image: '/src/assets/images/dish_crispy_chicken_1793919000437.jpg',
    isAvailable: true,
    sizes: [
      { id: 'size_half', name: { en: 'Half Chicken', fr: 'Demi Poulet', ar: 'نصف دجاجة' }, priceOffset: 0 },
      { id: 'size_whole', name: { en: 'Whole Chicken', fr: 'Poulet Entier', ar: 'دجاجة كاملة' }, priceOffset: 900 },
    ],
    preparationTimeMinutes: 20,
  },

  // Desserts
  {
    id: 'prod_fondant_choc',
    categoryId: 'cat_desserts',
    name: {
      en: 'Molten Chocolate Lava Cake Fondant',
      fr: 'Fondant au Chocolat Cœur Coulant',
      ar: 'فوندان كعكة الشوكولاتة الذائبة',
    },
    description: {
      en: 'Decadent 70% dark Belgian chocolate cake with warm flowing liquid center, scoop of pure Madagascar vanilla bean ice cream & berries.',
      fr: 'Gâteau gourmand au chocolat noir belge 70%, cœur ultra coulant tiède, boule de glace vanille Bourbon de Madagascar et fruits rouges.',
      ar: 'كعكة شوكولاتة بلجيكية فاخرة بقلب سائل دافئ يفيض عند أول ملعقة، مع كرة آيس كريم فانيليا بوربون وفواكه حمراء.',
    },
    price: 450,
    image: '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg',
    isPopular: true,
    isVegetarian: true,
    isAvailable: true,
    extras: [
      { id: 'ext_ice_cream_extra', name: { en: 'Extra Vanilla Scoop', fr: 'Boule de glace vanille en plus', ar: 'كرة آيس كريم إضافية' }, price: 120 },
      { id: 'ext_caramel', name: { en: 'Warm Salted Caramel Sauce', fr: 'Coulis caramel beurre salé', ar: 'كراميل مملح دافئ' }, price: 90 },
    ],
    preparationTimeMinutes: 8,
  },
  {
    id: 'prod_tiramisu_classic',
    categoryId: 'cat_desserts',
    name: {
      en: 'Artisanal Italian Tiramisu',
      fr: 'Tiramisu Artisanal au Café Espresso',
      ar: 'تيراميسو إيطالي أصيل بالقهوة',
    },
    description: {
      en: 'Layers of airy mascarpone cream, savoiardi biscuits soaked in freshly pulled Italian espresso, dusted with bitter cocoa powder.',
      fr: 'Crème mascarpone légère et aérée, biscuits à la cuillère imbibés d’espresso italien intense, saupoudrés de cacao pur.',
      ar: 'طبقات من كريمة الماسكاربوني الخفيفة وبسكويت السافوياردي المنقوع بقهوة الإسبريسو مع بودرة كاكاو فاخرة.',
    },
    price: 400,
    image: '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg',
    isVegetarian: true,
    isAvailable: true,
    preparationTimeMinutes: 5,
  },

  // Drinks
  {
    id: 'prod_mojito_fraise',
    categoryId: 'cat_drinks',
    name: {
      en: 'Fresh Strawberry Virgin Mojito',
      fr: 'Virgin Mojito Fraise & Menthe Fraîche',
      ar: 'موخيتو الفراولة والنعناع المنعش',
    },
    description: {
      en: 'Muddled fresh strawberries, wild garden spearmint, lime slices, sparkling soda water, and crushed crystal ice.',
      fr: 'Fraises fraîches écrasées au pilon, menthe fraîche cueillie, rondelles de citron vert, eau gazeuse vivifiante et glace pilée.',
      ar: 'حبات فراولة طازجة مهروسة، نعناع بلدي، شرائح ليمون أخضر، مياه فوارة ومجروش الثلج المنعش.',
    },
    price: 350,
    image: '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg',
    isPopular: true,
    isVegetarian: true,
    isAvailable: true,
    sizes: [
      { id: 'size_reg', name: { en: 'Regular (350ml)', fr: 'Standard (350ml)', ar: 'كوب عادي (350 مل)' }, priceOffset: 0 },
      { id: 'size_large', name: { en: 'Jumbo Pint (500ml)', fr: 'Grand Verre (500ml)', ar: 'كوب جامبو (500 مل)' }, priceOffset: 120 },
    ],
    preparationTimeMinutes: 4,
  },
  {
    id: 'prod_citronnade_maison',
    categoryId: 'cat_drinks',
    name: {
      en: 'Signature Fresh Lemonade with Mint',
      fr: 'Citronnade Maison Pressée à la Menthe',
      ar: 'عصير ليموناضة طبيعي بالنعناع',
    },
    description: {
      en: 'Freshly squeezed Algerian organic lemons, hint of orange blossom water, fresh crushed mint and pure cane sugar syrup.',
      fr: 'Citrons frais pressés d’Algérie, pointe délicate d’eau de fleur d’oranger, menthe fraîche pilée et sirop de canne pur.',
      ar: 'عصير ليمون جزائري معصور طازجاً، لمسة ماء زهر البرتقال، نعناع مطحون وشراب قصب السكر الطبيعي.',
    },
    price: 250,
    image: '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg',
    isVegetarian: true,
    isAvailable: true,
    preparationTimeMinutes: 3,
  },
  {
    id: 'prod_soda_can',
    categoryId: 'cat_drinks',
    name: {
      en: 'Chilled Soda Can (330ml)',
      fr: 'Canette Fraîche 33cl (Coca / Hamoud / Selecto)',
      ar: 'مشروب غازي بارد 330 مل (حمود بوعلام / سيليكتو / كوكا)',
    },
    description: {
      en: 'Choice of Hamoud Boualem, Selecto, Coca-Cola Zero, or Schweppes served ice-cold with lemon slice.',
      fr: 'Au choix : Hamoud Boualem La Blanche, Selecto Caramel, Coca-Cola ou Schweppes, servi glacé avec tranche de citron.',
      ar: 'اختيارك من حمود بوعلام الأصيل، سيليكتو، كوكاكولا أو شويبس مثلجة مع شريحة ليمون.',
    },
    price: 120,
    image: '/src/assets/images/dish_chocolate_fondant_1793918999440.jpg',
    isAvailable: true,
    preparationTimeMinutes: 1,
  },
];

export const INITIAL_TABLES: RestaurantTable[] = [
  { id: 'tbl_1', number: 1, label: 'Table 1 - Patio Garden', capacity: 2, status: 'available', active: true },
  { id: 'tbl_2', number: 2, label: 'Table 2 - Window View', capacity: 4, status: 'available', active: true },
  { id: 'tbl_3', number: 3, label: 'Table 3 - Central Dining', capacity: 4, status: 'available', active: true },
  { id: 'tbl_4', number: 4, label: 'Table 4 - Cozy Booth', capacity: 6, status: 'available', active: true },
  { id: 'tbl_5', number: 5, label: 'Table 5 - Terrace Terrace', capacity: 4, status: 'available', active: true },
  { id: 'tbl_6', number: 6, label: 'Table 6 - Chef View', capacity: 2, status: 'available', active: true },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_1039',
    orderNumber: '1',
    tableNumber: 1,
    items: [
      {
        id: 'item_1',
        product: INITIAL_PRODUCTS[0], // Margherita
        quantity: 1,
        selectedSize: INITIAL_PRODUCTS[0].sizes?.[1], // Large
        notes: 'Well baked crust',
        unitPrice: 950,
        totalPrice: 950,
      },
      {
        id: 'item_2',
        product: INITIAL_PRODUCTS[11], // Mojito
        quantity: 2,
        unitPrice: 350,
        totalPrice: 700,
      },
    ],
    total: 1650,
    status: 'served',
    createdAt: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    notes: 'Guests seated on patio',
    paymentMethod: 'cash',
  },
  {
    id: 'ord_1040',
    orderNumber: '2',
    tableNumber: 3,
    items: [
      {
        id: 'item_3',
        product: INITIAL_PRODUCTS[3], // Double Smash
        quantity: 2,
        notes: 'No raw onions, extra sauce',
        unitPrice: 850,
        totalPrice: 1700,
      },
      {
        id: 'item_4',
        product: INITIAL_PRODUCTS[7], // Crispy strips
        quantity: 1,
        unitPrice: 650,
        totalPrice: 650,
      },
    ],
    total: 2350,
    status: 'ready',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    notes: 'Ready for table delivery runner',
    paymentMethod: 'baridimob',
  },
  {
    id: 'ord_1041',
    orderNumber: '3',
    tableNumber: 5,
    items: [
      {
        id: 'item_5',
        product: INITIAL_PRODUCTS[5], // Tacos Supreme
        quantity: 1,
        selectedSize: INITIAL_PRODUCTS[5].sizes?.[0],
        selectedExtras: [INITIAL_PRODUCTS[5].extras![0]],
        unitPrice: 900,
        totalPrice: 900,
      },
      {
        id: 'item_6',
        product: INITIAL_PRODUCTS[12], // Citronnade
        quantity: 1,
        unitPrice: 250,
        totalPrice: 250,
      },
      {
        id: 'item_7',
        product: INITIAL_PRODUCTS[9], // Chocolate Fondant
        quantity: 1,
        unitPrice: 450,
        totalPrice: 450,
      },
    ],
    total: 1600,
    status: 'preparing',
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    notes: 'Serve dessert after main meal',
    paymentMethod: 'cash',
  },
  {
    id: 'ord_1042',
    orderNumber: '4',
    tableNumber: 2,
    items: [
      {
        id: 'item_8',
        product: INITIAL_PRODUCTS[1], // 4 Cheese Pizza
        quantity: 1,
        unitPrice: 950,
        totalPrice: 950,
      },
      {
        id: 'item_9',
        product: INITIAL_PRODUCTS[4], // Crispy Chicken burger
        quantity: 1,
        unitPrice: 750,
        totalPrice: 750,
      },
    ],
    total: 1700,
    status: 'new',
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    notes: 'Please bring water right away',
    paymentMethod: 'card',
  },
];

export const INITIAL_OFFERS: Offer[] = [
  {
    id: 'off_1',
    title: {
      en: 'Family Pizza Special Combo',
      fr: 'Menu Pizza Familial',
      ar: 'عرض البيتزا العائلي الخاص',
    },
    description: {
      en: '20% off whole order when spending 2,000 DA or more!',
      fr: '20% de réduction sur toute la commande dès 2 000 DA d\'achats !',
      ar: 'خصم 20% على كامل الطلب عند الشراء بقيمة 2000 د.ج أو أكثر!',
    },
    type: 'percentage',
    value: 20,
    appliesTo: 'order',
    minOrderAmount: 2000,
    startDate: new Date().toISOString().split('T')[0],
    isActive: true,
    bannerColor: '#FF5A1F',
    discountBadge: '-20%',
    validUntil: 'Every day',
  },
  {
    id: 'off_2',
    title: {
      en: 'Lunch Rush Pizza Deal',
      fr: 'Formule Déjeuner Pizza Express',
      ar: 'عرض الغداء السريع للبيتزا',
    },
    description: {
      en: '150 DA off any Artisan Pizza during lunch hours!',
      fr: '150 DA de réduction sur toutes les pizzas artisanales le midi !',
      ar: 'خصم 150 د.ج على جميع أنواع البيتزا خلال فترة الغداء!',
    },
    type: 'fixed_amount',
    value: 150,
    appliesTo: 'category',
    targetCategoryId: 'cat_pizza',
    startDate: new Date().toISOString().split('T')[0],
    activeDays: [1, 2, 3, 4], // Mon - Thu
    startTime: '11:30',
    endTime: '15:30',
    isActive: true,
    bannerColor: '#4F46E5',
    discountBadge: '-150 DA',
    validUntil: 'Mon - Thu 11:30 - 15:30',
  },
  {
    id: 'off_3',
    title: {
      en: 'Burger Duo Super Deal',
      fr: 'Offre Spéciale Duo Burgers',
      ar: 'عرض ثنائي البرغر المميز',
    },
    description: {
      en: '100 DA discount on our famous Gourmet and Nashville Crispy Burgers!',
      fr: '100 DA de remise sur nos burgers Gourmet et Nashville Crispy !',
      ar: 'خصم 100 د.ج على برغر الشيف الفاخر وكرسبي ناشفيل!',
    },
    type: 'fixed_amount',
    value: 100,
    appliesTo: 'product',
    targetProductIds: ['prod_burger_classic', 'prod_burger_chicken_crisp'],
    targetProductId: 'prod_burger_classic',
    startDate: new Date().toISOString().split('T')[0],
    isActive: true,
    bannerColor: '#10B981',
    discountBadge: '-100 DA',
    validUntil: 'Every day',
  },
];

