/**
 * PropertyAdapter - 백엔드 응답을 createPropertyCard 형식으로 변환
 */

/**
 * PropertyWithOffersDto를 createPropertyCard 형식으로 변환
 * @param {Object} propertyDto - PropertyWithOffersDto (offers 배열 포함)
 * @returns {Object} createPropertyCard가 기대하는 형식
 */
export function toCardModel(propertyDto) {
    // 유효한 offers만 필터링 (타입별 필수 가격 필드 체크)
    const validOffers = propertyDto.offers?.filter(offer => isValidOffer(offer)) || [];
    
    // 활성화된 유효한 offer 찾기 (isActive가 true인 것, 없으면 첫 번째 유효한 offer)
    const activeOffer = validOffers.find(offer => offer.isActive) || validOffers[0];
    
    // 가격 텍스트 생성
    const priceText = formatPrice(activeOffer);
    
    // 상세 정보 생성 (offers 정보 활용)
    const details = formatDetails(propertyDto, activeOffer);
    
    // 태그 생성
    const tags = generateTags(propertyDto, activeOffer);
    
    // 이미지 URL (property_images 테이블에서 조회 필요하지만 일단 더미)
    const imageUrl = getFirstImageUrl(propertyDto) || 'https://via.placeholder.com/400x300?text=No+Image';
    
    // 주소에서 구/동 추출
    const location = formatLocation(propertyDto.address);
    
    // 옵션 정보 (offers의 oftion 비트에서 추출)
    const options = parseOptions(activeOffer?.oftion);
    
    return {
        id: propertyDto.id,
        image: imageUrl,
        price: priceText,
        location: location,
        details: details,
        tags: tags,
        isRecommended: determineRecommended(propertyDto), // 추천 로직
        buildingYear: propertyDto.buildingYear,
        options: options,
        description: propertyDto.title,
        brokerName: '', // brokerUserId로 조회 필요
        brokerPhone: '',
        status: propertyDto.status,
        // 추가 정보들
        areaM2: propertyDto.areaM2,
        listingType: propertyDto.listingType,
        locationX: propertyDto.locationX,
        locationY: propertyDto.locationY,
        anomalyAlert: propertyDto.anomalyAlert
    };
}

/**
 * offer의 유효성 검사 (타입별 필수 가격 필드 체크)
 */
function isValidOffer(offer) {
    if (!offer || !offer.type) return false;
    
    const { type, totalPrice, deposit, monthlyRent } = offer;
    
    // 매매: total_price 필수
    if (type === 'SALE') {
        return totalPrice != null && Number(totalPrice) > 0;
    }
    // 전세: deposit 필수
    else if (type === 'JEONSE') {
        return deposit != null && Number(deposit) > 0;
    }
    // 월세: deposit + monthly_rent 필수
    else if (type === 'WOLSE') {
        return deposit != null && Number(deposit) >= 0 && 
               monthlyRent != null && Number(monthlyRent) > 0;
    }
    
    return false;
}

/**
 * 가격 텍스트 포맷팅
 */
function formatPrice(offer) {
    if (!offer) return '내용 없음';
    
    const { type, totalPrice, deposit, monthlyRent } = offer;
    
    if (type === 'SALE') {
        return formatCurrency(totalPrice, '매매');
    } else if (type === 'JEONSE') {
        return formatCurrency(deposit, '전세');
    } else if (type === 'WOLSE') {
        const depositText = formatCurrency(deposit, '');
        const monthlyText = formatCurrency(monthlyRent, '');
        return `월세 ${depositText}/${monthlyText}`;
    }
    
    return '내용 없음';
}

/**
 * 통화 포맷팅 (억/만원 단위)
 */
function formatCurrency(amount, prefix = '') {
    if (!amount) return '';
    
    const num = Number(amount);
    if (num >= 100000000) {
        const eok = Math.floor(num / 100000000);
        const man = Math.floor((num % 100000000) / 10000);
        if (man === 0) {
            return `${prefix} ${eok}억`;
        } else {
            return `${prefix} ${eok}억 ${man}`;
        }
    } else if (num >= 10000) {
        const man = Math.floor(num / 10000);
        return `${prefix} ${man}만`;
    } else {
        return `${prefix} ${num.toLocaleString()}`;
    }
}

/**
 * 상세 정보 포맷팅 (offers 정보 활용)
 */
function formatDetails(propertyDto, offer) {
    const parts = [];
    
    // 건물 타입
    if (offer?.housetype) {
        const typeMap = {
            'APART': '아파트',
            'BILLA': '빌라', 
            'ONE': '원룸'
        };
        parts.push(typeMap[offer.housetype] || offer.housetype);
    } else {
        // offer가 없을 때 기본 정보
        parts.push('정보 없음');
    }
    
    // 방 수 (offers에서 추출 - 실제로는 별도 필드가 있을 수 있음)
    if (offer?.floor) {
        // floor가 실제로는 방 수를 나타낼 수도 있으니 확인 필요
        const roomCount = Math.floor(offer.floor / 10) || 1;
        parts.push(`방 ${roomCount}개`);
    }
    
    // 층수 (offers에서 추출)
    if (offer?.floor) {
        parts.push(`${offer.floor}층`);
    }
    
    // 면적
    if (propertyDto.areaM2) {
        parts.push(`${Math.round(Number(propertyDto.areaM2))}m²`);
    }
    
    return parts.join(' ∙ ');
}

/**
 * 태그 생성
 */
function generateTags(propertyDto, offer) {
    const tags = [];
    
    // 거래 유형
    if (propertyDto.listingType === 'OWNER') {
        tags.push('직거래');
    } else if (propertyDto.listingType === 'BROKER') {
        tags.push('중개');
    }
    
    // 이상 거래 알림
    if (propertyDto.anomalyAlert) {
        tags.push('확인');
    }
    
    // 상태별 태그
    if (propertyDto.status === 'AVAILABLE') {
        tags.push('추천');
    }
    
    return tags;
}

/**
 * 첫 번째 이미지 URL 가져오기 (property_images 테이블에서 조회 필요)
 */
function getFirstImageUrl(propertyDto) {
    // TODO: property_images 테이블과 조인해서 실제 이미지 URL 반환
    // 현재는 더미 이미지 사용
    return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop';
}

/**
 * 주소에서 구/동 추출
 */
function formatLocation(address) {
    if (!address) return '';
    
    // "서울시 강남구 역삼동" → "강남구 역삼동"
    const parts = address.split(' ');
    if (parts.length >= 3) {
        return parts.slice(1, 3).join(' ');
    }
    
    return address;
}

/**
 * 옵션 비트 파싱 (offers의 oftion 필드)
 */
function parseOptions(oftionBit) {
    if (!oftionBit) return [];
    
    // 비트 플래그를 옵션 배열로 변환
    // 실제 비트 매핑은 백엔드와 협의 필요
    const optionMap = {
        1: '에어컨',
        2: '냉장고', 
        4: '세탁기',
        8: '인터넷',
        16: '주차장',
        32: '엘리베이터',
        64: '관리사무소',
        128: 'CCTV'
    };
    
    const options = [];
    for (const [bit, name] of Object.entries(optionMap)) {
        if (oftionBit & parseInt(bit)) {
            options.push(name);
        }
    }
    
    return options;
}

/**
 * 추천 여부 결정
 */
function determineRecommended(propertyDto) {
    // 추천 로직: 최근 등록, 이상 거래 알림 없음, AVAILABLE 상태
    const isRecent = propertyDto.createdAt && 
        new Date(propertyDto.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7일 이내
    const isClean = !propertyDto.anomalyAlert;
    const isAvailable = propertyDto.status === 'AVAILABLE';
    
    return isRecent && isClean && isAvailable;
}


