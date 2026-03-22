CREATE DATABASE IF NOT EXISTS kitchen_stories;
USE kitchen_stories;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'customer') DEFAULT 'customer',
  name VARCHAR(100) NOT NULL
);

-- MenuItems
CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  image VARCHAR(255),
  veg_status ENUM('veg', 'nonveg') NOT NULL
);

-- Specials
CREATE TABLE IF NOT EXISTS specials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  image VARCHAR(255),
  tag VARCHAR(50) DEFAULT 'Special',
  veg_status ENUM('veg', 'nonveg') NOT NULL
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  rating INT NOT NULL,
  text TEXT,
  dish VARCHAR(100),
  date_posted DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status ENUM('Placed', 'Confirmed', 'Delivered') DEFAULT 'Placed',
  order_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OrderItems
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  item_id INT NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guests INT NOT NULL,
  occasion VARCHAR(50),
  seating VARCHAR(50),
  notes TEXT,
  status ENUM('Pending', 'Confirmed', 'Cancelled') DEFAULT 'Pending',
  booked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data (Users)
INSERT IGNORE INTO users (username, password, role, name) VALUES 
('customer1', 'pass123', 'customer', 'Rahul Sharma'),
('customer2', 'pass456', 'customer', 'Priya Mehta'),
('admin', 'admin@123', 'admin', 'Admin');

-- Seed Data (MenuItems)
INSERT INTO menu_items (name, category, price, description, image, veg_status) VALUES
('Paneer Tikka', 'Starter', 220, 'Marinated cottage cheese grilled in tandoor with spices.', 'https://i.pinimg.com/736x/db/4f/a0/db4fa0fedecaa1b4e4408a068439e1ec.jpg', 'veg'),
('Chicken Seekh Kebab', 'Starter', 280, 'Minced chicken with herbs, skewered and grilled to perfection.', '', 'nonveg'),
('Veg Spring Rolls', 'Starter', 160, 'Crispy rolls stuffed with seasoned mixed vegetables.', '', 'veg'),
('Fish Amritsari', 'Starter', 320, 'Battered fish fillets with ajwain and chilli coating.', '', 'nonveg'),
('Dal Makhani', 'Main Course', 200, 'Slow-cooked black lentils in a rich buttery tomato gravy.', '', 'veg'),
('Butter Chicken', 'Main Course', 320, 'Tender chicken in a creamy tomato-based sauce.', '', 'nonveg'),
('Paneer Butter Masala', 'Main Course', 260, 'Soft paneer cubes in a luscious butter masala gravy.', '', 'veg'),
('Lamb Rogan Josh', 'Main Course', 380, 'Aromatic Kashmiri lamb curry with whole spices.', '', 'nonveg'),
('Jeera Rice', 'Main Course', 130, 'Basmati rice tempered with cumin and ghee.', '', 'veg'),
('Garlic Naan', 'Main Course', 60, 'Soft leavened bread with garlic butter, baked in tandoor.', '', 'veg'),
('Samosa (2 pcs)', 'Snacks', 60, 'Crispy pastry filled with spiced potato and peas.', '', 'veg'),
('Aloo Tikki Chaat', 'Snacks', 90, 'Pan-fried potato patties topped with chutneys and yoghurt.', '', 'veg'),
('Chicken Sandwich', 'Snacks', 140, 'Grilled chicken with veggies in soft brown bread.', '', 'nonveg'),
('French Fries', 'Snacks', 110, 'Golden crispy potato fries with seasoning.', '', 'veg'),
('Gulab Jamun', 'Dessert', 80, 'Soft milk-solid dumplings soaked in rose-flavoured sugar syrup.', '', 'veg'),
('Chocolate Brownie', 'Dessert', 150, 'Warm fudgy brownie served with a scoop of vanilla ice cream.', '', 'veg'),
('Kulfi Falooda', 'Dessert', 130, 'Traditional Indian ice cream with rose syrup and vermicelli.', '', 'veg'),
('Veg Hakka Noodles', 'Chinese', 170, 'Stir-fried noodles with crisp vegetables in Indo-Chinese sauce.', '', 'veg'),
('Chicken Fried Rice', 'Chinese', 210, 'Wok-tossed rice with egg, chicken and spring onion.', '', 'nonveg'),
('Manchurian Gravy', 'Chinese', 190, 'Deep-fried veggie balls in a tangy Manchurian sauce.', '', 'veg'),
('Schezwan Prawns', 'Chinese', 350, 'Juicy prawns tossed in fiery schezwan sauce.', '', 'nonveg'),
('Margherita Pizza', 'Italian', 280, 'Classic tomato base with mozzarella and fresh basil.', '', 'veg'),
('Pasta Arrabbiata', 'Italian', 240, 'Penne in a spicy tomato sauce with garlic and red chilli.', '', 'veg'),
('Chicken Lasagne', 'Italian', 360, 'Layers of pasta, minced chicken and béchamel sauce baked golden.', '', 'nonveg'),
('Garlic Bread', 'Italian', 120, 'Toasted baguette slices with herbed garlic butter.', 'https://i.pinimg.com/736x/38/19/a1/3819a163d2ae93ea60f4a3c85d821cf1.jpg', 'veg');

-- Seed Data (Specials)
INSERT INTO specials (name, price, description, image, tag, veg_status) VALUES
('Truffle Mushroom Risotto', 420, 'Creamy Arborio rice with wild mushrooms and truffle oil.', '', 'Chef''s Pick', 'veg'),
('Tandoori Jhinga', 490, 'Jumbo prawns marinated in spiced yoghurt, grilled in tandoor.', '', 'Seasonal', 'nonveg'),
('Basque Cheesecake', 200, 'Rich burnt Basque-style cheesecake with berry coulis.', '', 'New', 'veg');

-- Seed Data (Reviews)
INSERT INTO reviews (name, rating, text, dish, date_posted) VALUES
('Amit Kulkarni', 5, 'Absolutely loved the Butter Chicken! The ambiance is great for a family dinner. Will definitely come back.', 'Butter Chicken', NOW() - INTERVAL 2 DAY),
('Sneha Patel', 4, 'Paneer Tikka was perfectly marinated and the service was quick. The seating near the window was a lovely touch.', 'Paneer Tikka', NOW() - INTERVAL 7 DAY),
('Rohan Desai', 5, 'Best Chinese food in Pune! Hakka Noodles and Manchurian were top-notch. Came for a birthday dinner and it was fantastic.', 'Hakka Noodles', NOW() - INTERVAL 14 DAY),
('Nisha Verma', 3, 'Good food but the wait time was a bit long. The Garlic Bread was delicious though.', 'Garlic Bread', NOW() - INTERVAL 21 DAY);
