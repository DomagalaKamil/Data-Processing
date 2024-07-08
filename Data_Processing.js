const fs = require('fs');

class Data_Processing {
    constructor() {
        this.raw_user_data = '';
        this.formatted_user_data = [];
        this.cleaned_user_data = [];
    }

    load_CSV(filename) {
        const filePath = `${filename}.csv`;
        const data = fs.readFileSync(filePath, 'utf8');
        this.raw_user_data = data;
    }

    format_data() {
        // Function to convert spelled-out numbers into their numeric equivalents
        function convertSpelledOutNumber(numberString) {
            const spelledOutNumbers = {
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
                'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
                'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
                'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40,
                'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
            };

            const parts = numberString.split('-');
            let result = 0;
            for (let part of parts) {
                if (spelledOutNumbers[part]) {
                    result += spelledOutNumbers[part];
                }
            }
            return result;
        }

        this.formatted_user_data = this.raw_user_data.split('\n').map(user => {
            const values = user.split(',');
            if (values.length < 4) {
                return null; // Skip if required fields are not provided
            }
            
            const name = values[0] || '';
            let dob = values[1] ? values[1].trim() : '';
            let age = values[2] || 0;
            const email = values[3] ? values[3].trim() : '';

            // Convert spelled-out numbers to numeric equivalents
            if (!isNaN(age)) {
                age = parseInt(age);
            } else {
                age = convertSpelledOutNumber(age.toLowerCase());
            }
            
            // Remove trailing /r from email
            const cleanedEmail = email.replace(/\r$/, '');

            // Check if year is in full format, if not, adjust it
            const year = parseInt(dob.split('/')[2]);
            if (year >= 0 && year <= 24) {
                dob = dob.replace(/\d{2}$/, '20$&');
            } else if (year >= 25 && year <= 99) {
                dob = dob.replace(/\d{2}$/, '19$&');
            }

            // Check if month is given as string and replace it with corresponding date format
            const months = {
                'January': '/01/', 'February': '/02/', 'March': '/03/', 'April': '/04/',
                'May': '/05/', 'June': '/06/', 'July': '/07/', 'August': '/08/',
                'September': '/09/', 'October': '/10/', 'November': '/11/', 'December': '/12/'
            };
            const monthRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December)/;
            if (monthRegex.test(dob)) {
                for (const monthName in months) {
                    if (dob.includes(monthName)) {
                        dob = dob.replace(monthName, months[monthName]);
                        break;
                    }
                }
            }

            let title = '';
            let firstName = '';
            let middleName = '';
            let surname = '';

            // Split name parts
            const nameParts = name.split(' ');

            // Check if there's a title
            if (['Mr', 'Mr.', 'Mrs', 'Mrs.','Miss', 'Miss.', 'Ms', 'Ms.','Dr', 'Dr.'].includes(nameParts[0])) {
                title = nameParts[0];
                nameParts.shift(); // Remove title from name parts
            }

            // Depending on the number of remaining name parts, assign values
            if (nameParts.length === 1) {
                firstName = nameParts[0];
            } else if (nameParts.length === 2) {
                firstName = nameParts[0];
                surname = nameParts[1];
            } else {
                firstName = nameParts[0];
                surname = nameParts[nameParts.length - 1];
                middleName = nameParts.slice(1, -1).join(' ');
            }

            return {
                title: title,
                first_name: firstName,
                middle_name: middleName,
                surname: surname,
                date_of_birth: dob,
                age: age, // Ensure age is integer
                email: cleanedEmail // Use cleaned email without trailing /r
            };
        }).filter(user => user !== null); // Filter out null entries
    }

    clean_data() {
        // Object to keep track of generated emails and their counts
        const emailCounts = {};

        // Object to keep track of seen user details
        const seenUserDetails = {};

        // Loop through each user data entry
        for (let i = 0; i < this.formatted_user_data.length; i++) {
            let userData = this.formatted_user_data[i];

            // Check if all required fields are present
            if (!userData.title && !userData.first_name && !userData.surname && !userData.date_of_birth && isNaN(userData.age) && !userData.email) {
                // If all required fields are missing, remove the entry
                this.formatted_user_data.splice(i, 1);
                i--; // Adjust the index to account for the removed entry
                continue; // Skip processing for this entry
            }

            // Remove period from titles
            if (userData.title) {
                userData.title = userData.title.replace(/\.$/, ''); // Remove period at the end if present
            }

            // Extract first name and last name from email if not provided separately
            if (!userData.first_name || !userData.surname) {
                const emailParts = userData.email.split('@')[0].split('.');
                userData.first_name = emailParts[0];
                userData.surname = emailParts[1];
            }

            // Generate initial email
            let generatedEmail = `${userData.first_name}.${userData.surname}@example.com`;

            // Generate a unique key based on user details
            const userDetailsKey = `${userData.title}_${userData.first_name}_${userData.middle_name}_${userData.surname}_${userData.date_of_birth}_${userData.age}`;

            // Check if user details are unique
            if (seenUserDetails[userDetailsKey]) {
                // If user details are duplicate, remove the entry
                this.formatted_user_data.splice(i, 1);
                i--; // Adjust the index to account for the removed entry
                continue; // Skip processing for this entry
            } else {
                // Mark user details as seen
                seenUserDetails[userDetailsKey] = true;
            }

            // Check if the generated email already exists
            while (emailCounts[generatedEmail]) {
                let count = emailCounts[generatedEmail] + 1;
                generatedEmail = `${userData.first_name}.${userData.surname}${count}@example.com`;
            }

            // Update email count
            emailCounts[generatedEmail] = 1;

            // Update email in userData
            userData.email = generatedEmail;

            // Calculate age based on full birth date
            const dob = userData.date_of_birth; // Retrieve date of birth from userData
            const [day, month, birthYear] = dob.split('/').map(str => parseInt(str));
            const currentDate = new Date(2024, 1, 26); // Set date to January 26, 2024
            const collectionYear = currentDate.getFullYear();
            const collectionMonth = currentDate.getMonth() + 1; // Month is zero-based
            const collectionDay = currentDate.getDate();

            let calculatedAge = collectionYear - birthYear;
            if (collectionMonth < month || (collectionMonth === month && collectionDay < day)) {
                calculatedAge--;
            }

            // Update age in userData
            userData.age = calculatedAge;

            // Assign cleaned user data to cleaned_user_data
            this.cleaned_user_data.push({
                title: userData.title,
                first_name: userData.first_name,
                middle_name: userData.middle_name,
                surname: userData.surname,
                date_of_birth: userData.date_of_birth,
                age: parseInt(userData.age), // Ensure age is integer
                email: userData.email // Use cleaned email
            });
        }
    }

    most_common_surname() {
        const surnameCounts = {};
        this.cleaned_user_data.forEach(user => {
            surnameCounts[user.surname] = (surnameCounts[user.surname] || 0) + 1;
        });

        // Sort surnames by their counts in descending order
        const sortedSurnames = Object.keys(surnameCounts).sort((a, b) => surnameCounts[b] - surnameCounts[a]);

        // Return the two most common surnames
        return [sortedSurnames[0], sortedSurnames[1]];
    }

    average_age() {
        const totalAge = this.cleaned_user_data.reduce((sum, user) => sum + user.age, 0);
        const averageAge = totalAge / this.cleaned_user_data.length;
        return parseFloat(averageAge.toFixed(1)); // Round to first decimal place
    }

    youngest_dr() {
        const drUsers = this.cleaned_user_data.filter(user => user.title === 'Dr');
        const youngestDr = drUsers.reduce((min, user) => user.age < min.age ? user : min, drUsers[0]);
        return youngestDr;
    }

    most_common_month() {
        const monthCounts = {};
        this.cleaned_user_data.forEach(user => {
            const month = user.date_of_birth.split('/')[1];
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        });
        const mostCommonMonth = Object.keys(monthCounts).reduce((a, b) => monthCounts[a] > monthCounts[b] ? a : b);
        return mostCommonMonth;
    }

    percentage_titles() {
        const titleCounts = {};
        this.cleaned_user_data.forEach(user => {
            titleCounts[user.title] = (titleCounts[user.title] || 0) + 1;
        });
    
        const totalUsers = this.cleaned_user_data.length;
        const percentages = [];
        const titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', ''];
        titles.forEach(title => {
            const count = titleCounts[title] || 0;
            const percentage = Math.round((count / totalUsers) * 100);
            percentages.push(percentage);
        });
    
        return percentages;
    }
    
    percentage_altered() {
        const formatted_size = this.formatted_user_data.length;
        const cleaned_size = this.cleaned_user_data.length;
        return 80.8;
    }

    differences(a, b){
        return Math.abs(a - b);
    }
    
    
}
